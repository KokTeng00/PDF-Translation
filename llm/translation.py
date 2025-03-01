import numpy as np
import pandas as pd
import torch
from torch.utils.data import DataLoader
from transformers import MarianMTModel, MarianTokenizer, DataCollatorForSeq2Seq
from transformers.optimization import AdamW
from datasets import Dataset
import evaluate
from peft import VBLoRAConfig, get_peft_model

model_name = "Helsinki-NLP/opus-mt-en-zh"
model = MarianMTModel.from_pretrained(model_name)
tokenizer = MarianTokenizer.from_pretrained(model_name)

vb_lora_config = VBLoRAConfig(
    task_type="SEQ_CLS",
    r=4,
    target_modules=["fc1", "fc2", "k_proj", "out_proj", "q_proj", "v_proj"],
    num_vectors=60,
    vector_length=256,
    save_only_topk_weights=True,
)
model = get_peft_model(model, vb_lora_config)

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

data_collator = DataCollatorForSeq2Seq(tokenizer, model=model)

batch_size = 64
train_dataloader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, collate_fn=data_collator)
val_dataloader = DataLoader(val_dataset, batch_size=batch_size, collate_fn=data_collator)
test_dataloader = DataLoader(test_dataset, batch_size=batch_size, collate_fn=data_collator)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model.to(device)

# Setup the optimizer
optimizer = AdamW(model.parameters(), lr=5e-5)
bleu_metric = evaluate.load("bleu")

# Training loop
num_epochs = 1
for epoch in range(num_epochs):
    model.train()
    total_loss = 0.0
    for batch in train_dataloader:
        # Move batch tensors to device
        batch = {k: v.to(device) for k, v in batch.items()}
        outputs = model(**batch)
        loss = outputs.loss
        loss.backward()
        optimizer.step()
        optimizer.zero_grad()
        total_loss += loss.item()
    
    avg_loss = total_loss / len(train_dataloader)
    print(f"Epoch {epoch+1}/{num_epochs} - Training loss: {avg_loss:.4f}")
    
    # Validation
    model.eval()
    preds = []
    refs = []
    with torch.no_grad():
        for batch in val_dataloader:
            batch = {k: v.to(device) for k, v in batch.items()}
            generated_ids = model.generate(batch["input_ids"],
                                           attention_mask=batch["attention_mask"],
                                           max_length=128)
            decoded_preds = tokenizer.batch_decode(generated_ids, skip_special_tokens=True)
            # Replace -100 in labels and decode
            labels = batch["labels"]
            labels = torch.where(labels != -100, labels, tokenizer.pad_token_id)
            decoded_labels = tokenizer.batch_decode(labels, skip_special_tokens=True)
            preds.extend(decoded_preds)
            refs.extend(decoded_labels)
    
    bleu_score = bleu_metric.compute(predictions=preds, references=[[ref] for ref in refs])
    print(f"Epoch {epoch+1}/{num_epochs} - Validation BLEU: {bleu_score['bleu']:.4f}")

# Final testing evaluation
model.eval()
preds = []
refs = []
with torch.no_grad():
    for batch in test_dataloader:
        batch = {k: v.to(device) for k, v in batch.items()}
        generated_ids = model.generate(batch["input_ids"],
                                       attention_mask=batch["attention_mask"],
                                       max_length=128)
        decoded_preds = tokenizer.batch_decode(generated_ids, skip_special_tokens=True)
        labels = batch["labels"]
        labels = torch.where(labels != -100, labels, tokenizer.pad_token_id)
        decoded_labels = tokenizer.batch_decode(labels, skip_special_tokens=True)
        preds.extend(decoded_preds)
        refs.extend(decoded_labels)

bleu_score = bleu_metric.compute(predictions=preds, references=[[ref] for ref in refs])
print("Test BLEU:", bleu_score["bleu"])
