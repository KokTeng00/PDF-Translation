import optuna
import numpy as np
import pandas as pd
import torch
from torch.utils.data import DataLoader
from transformers import MarianConfig, MarianMTModel, MarianTokenizer, DataCollatorForSeq2Seq
from transformers.optimization import AdamW
from datasets import Dataset
import evaluate
from peft import VBLoRAConfig, get_peft_model, TaskType

model_name = "Helsinki-NLP/opus-mt-en-zh"
tokenizer = MarianTokenizer.from_pretrained(model_name)

train_df = pd.read_json("translation2019zh_train.json", lines=True)
val_df = pd.read_json("translation2019zh_valid.json", lines=True)
test_df = pd.read_json("translation2019zh_test.json", lines=True)

train_dataset = Dataset.from_pandas(train_df)
val_dataset = Dataset.from_pandas(val_df)
test_dataset = Dataset.from_pandas(test_df)

def tokenize_function(example):
    model_inputs = tokenizer(example["english"], truncation=True, max_length=128)
    with tokenizer.as_target_tokenizer():
        labels = tokenizer(example["chinese"], truncation=True, max_length=128)
    model_inputs["labels"] = labels["input_ids"]
    return model_inputs

train_dataset = train_dataset.map(tokenize_function, batched=True, remove_columns=["english", "chinese"])
val_dataset = val_dataset.map(tokenize_function, batched=True, remove_columns=["english", "chinese"])
test_dataset = test_dataset.map(tokenize_function, batched=True, remove_columns=["english", "chinese"])

bleu_metric = evaluate.load("bleu")
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")


def objective(trial):
    batch_size = trial.suggest_categorical("batch_size", [32, 64, 128])
    num_epochs = trial.suggest_int("num_epochs", 1, 3)
    dropout = trial.suggest_float("dropout", 0.1, 0.5, step=0.1)
    learning_rate = trial.suggest_float("learning_rate", 1e-5, 1e-4, log=True)

    base_config = MarianConfig.from_pretrained(model_name)
    base_config.dropout = dropout

    base_model = MarianMTModel.from_pretrained(model_name, config=base_config)

    vb_lora_config = VBLoRAConfig(
        task_type=TaskType.SEQ_2_SEQ_LM,
        r=4,
        target_modules=["fc1", "fc2", "self_attn.k_proj", "self_attn.q_proj", 
                        "self_attn.v_proj", "self_attn.out_proj"],
        num_vectors=60,
        vector_length=256,
        save_only_topk_weights=True,
    )

    peft_model = get_peft_model(base_model, vb_lora_config)
    peft_model.to(device)

    data_collator = DataCollatorForSeq2Seq(tokenizer, model=peft_model)

    train_dataloader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, collate_fn=data_collator)
    val_dataloader = DataLoader(val_dataset, batch_size=batch_size, collate_fn=data_collator)

    optimizer = AdamW(peft_model.parameters(), lr=learning_rate)

    peft_model.train()
    for epoch in range(num_epochs):
        for batch in train_dataloader:
            batch = {k: v.to(device) for k, v in batch.items()}
            outputs = peft_model(**batch)
            loss = outputs.loss
            loss.backward()
            optimizer.step()
            optimizer.zero_grad()

    peft_model.eval()
    preds = []
    refs = []
    with torch.no_grad():
        for batch in val_dataloader:
            batch = {k: v.to(device) for k, v in batch.items()}
            generated_ids = peft_model.generate(
                batch["input_ids"],
                attention_mask=batch["attention_mask"],
                max_length=128
            )
            decoded_preds = tokenizer.batch_decode(generated_ids, skip_special_tokens=True)
            labels = batch["labels"]
            labels = torch.where(labels != -100, labels, tokenizer.pad_token_id)
            decoded_labels = tokenizer.batch_decode(labels, skip_special_tokens=True)

            preds.extend(decoded_preds)
            refs.extend(decoded_labels)

    bleu_score = bleu_metric.compute(predictions=preds, references=[[ref] for ref in refs])["bleu"]

    return bleu_score

study = optuna.create_study(direction="maximize")
study.optimize(objective, n_trials=15)

print("Number of finished trials:", len(study.trials))
print("Best trial:")
best_trial = study.best_trial
print("  Value (Validation BLEU):", best_trial.value)
print("  Params:", best_trial.params)

best_batch_size = study.best_params["batch_size"]
best_num_epochs = study.best_params["num_epochs"]
best_dropout = study.best_params["dropout"]
best_lr = study.best_params["learning_rate"]

print("Training final model with:")
print(f"  batch_size={best_batch_size}")
print(f"  num_epochs={best_num_epochs}")
print(f"  dropout={best_dropout}")
print(f"  learning_rate={best_lr}")

base_config = MarianConfig.from_pretrained(model_name)
base_config.dropout = best_dropout

final_base_model = MarianMTModel.from_pretrained(model_name, config=base_config)

vb_lora_config = VBLoRAConfig(
    task_type=TaskType.SEQ_2_SEQ_LM,
    r=4,
    target_modules=["fc1", "fc2", "self_attn.k_proj", "self_attn.q_proj", 
                    "self_attn.v_proj", "self_attn.out_proj"],
    num_vectors=60,
    vector_length=256,
    save_only_topk_weights=True,
)

final_model = get_peft_model(final_base_model, vb_lora_config)
final_model.to(device)

data_collator = DataCollatorForSeq2Seq(tokenizer, model=final_model)

train_dataloader = DataLoader(train_dataset, batch_size=best_batch_size, shuffle=True, collate_fn=data_collator)
val_dataloader = DataLoader(val_dataset, batch_size=best_batch_size, collate_fn=data_collator)
test_dataloader = DataLoader(test_dataset, batch_size=best_batch_size, collate_fn=data_collator)

optimizer = AdamW(final_model.parameters(), lr=best_lr)

for epoch in range(best_num_epochs):
    final_model.train()
    total_loss = 0.0
    for batch in train_dataloader:
        batch = {k: v.to(device) for k, v in batch.items()}
        outputs = final_model(**batch)
        loss = outputs.loss
        loss.backward()
        optimizer.step()
        optimizer.zero_grad()
        total_loss += loss.item()

    avg_loss = total_loss / len(train_dataloader)
    print(f"[Final Training] Epoch {epoch+1}/{best_num_epochs} - Loss: {avg_loss:.4f}")

final_model.eval()
preds = []
refs = []
with torch.no_grad():
    for batch in test_dataloader:
        batch = {k: v.to(device) for k, v in batch.items()}
        generated_ids = final_model.generate(
            batch["input_ids"],
            attention_mask=batch["attention_mask"],
            max_length=128
        )
        decoded_preds = tokenizer.batch_decode(generated_ids, skip_special_tokens=True)
        labels = batch["labels"]
        labels = torch.where(labels != -100, labels, tokenizer.pad_token_id)
        decoded_labels = tokenizer.batch_decode(labels, skip_special_tokens=True)
        preds.extend(decoded_preds)
        refs.extend(decoded_labels)

test_bleu_score = bleu_metric.compute(predictions=preds, references=[[ref] for ref in refs])["bleu"]
print("Final Test BLEU:", test_bleu_score)
