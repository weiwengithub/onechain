import json
import re
from pathlib import Path
from googletrans import Translator  # pip install googletrans==4.0.0-rc1

input_path = Path("en.json")   # 输入文件路径
output_path = Path("zh.json")  # 输出文件路径

translator = Translator()

# 保留占位符的正则
placeholder_pattern = re.compile(r"{{\s*[^{}]+\s*}}")

def translate_text_preserve_placeholders(text: str) -> str:
    if not text.strip():
        return text
    placeholders = placeholder_pattern.findall(text)
    temp_text = placeholder_pattern.sub("###PLACEHOLDER###", text)

    try:
        translated = translator.translate(temp_text, src="en", dest="zh-CN").text
    except Exception as e:
        print("⚠️ 翻译失败:", e)
        return text

    for ph in placeholders:
        translated = translated.replace("###PLACEHOLDER###", ph, 1)
    return translated

def deep_translate(data):
    if isinstance(data, dict):
        return {k: deep_translate(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [deep_translate(i) for i in data]
    elif isinstance(data, str):
        return translate_text_preserve_placeholders(data)
    else:
        return data

if __name__ == "__main__":
    with open(input_path, "r", encoding="utf-8") as f:
        en_data = json.load(f)

    zh_data = deep_translate(en_data)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(zh_data, f, ensure_ascii=False, indent=2)

    print("✅ 翻译完成，输出文件：", output_path)
