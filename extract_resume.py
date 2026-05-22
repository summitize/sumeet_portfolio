from pathlib import Path
import PyPDF2
p=Path("Sumeet Resume.pdf")
reader=PyPDF2.PdfReader(str(p))
text="\n".join(page.extract_text() or "" for page in reader.pages)
print(text[:12000])
