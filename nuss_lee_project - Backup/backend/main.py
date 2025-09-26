# backend/main.py

import os
import uvicorn
import json
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from dotenv import load_dotenv
import io
from PIL import Image

# Load environment variables
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY is not set in the .env file or environment variables. Please set it.")

# Configure Gemini API
genai.configure(api_key=GEMINI_API_KEY)

MODEL_NAME_FOR_VISION = "gemini-1.5-flash-latest"

try:
    model_info = genai.get_model(MODEL_NAME_FOR_VISION)
    if 'generateContent' not in model_info.supported_generation_methods:
        raise ValueError(f"Model '{MODEL_NAME_FOR_VISION}' does not support 'generateContent' method.")
    model = genai.GenerativeModel(MODEL_NAME_FOR_VISION)
    print(f"INFO: تم تهيئة نموذج Gemini بنجاح للاستخدام.")
except Exception as e:
    print(f"CRITICAL ERROR: فشل في تهيئة نموذج Gemini '{MODEL_NAME_FOR_VISION}'.")
    print(f"الخطأ: {e}")
    raise RuntimeError(f"فشل حرج في إعداد نموذج Gemini. يرجى التحقق من '{MODEL_NAME_FOR_VISION}' ومفتاح API الخاص بك.")


app = FastAPI(
    title="نُص لي: مساعد النصوص البصرية بالذكاء الاصطناعي",
    description="واجهة برمجة تطبيقات backend لتطبيق نُص لي، مدعومة من Google Gemini لتحليل الصور.",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load local dictionary on startup
local_dictionary = []
try:
    with open('dictionary.json', 'r', encoding='utf-8') as f:
        local_dictionary = json.load(f)
    print("INFO: تم تحميل قاموس الإشارة المحلي بنجاح.")
except Exception as e:
    print(f"WARNING: لم يتم تحميل القاموس المحلي 'dictionary.json'. الخطأ: {e}")


@app.get("/")
async def root():
    return {"message": "أهلاً بك في Nuss-Lee Backend API! اذهب إلى /docs لوثائق OpenAPI."}

@app.get("/search-dictionary/")
async def search_local_dictionary(query: str = Query(..., min_length=1, description="الكلمة أو العبارة للبحث عنها في القاموس المحلي.")):
    if not local_dictionary:
        raise HTTPException(
            status_code=500,
            detail="القاموس المحلي غير متوفر أو فارغ في الخادم."
        )

    search_query = query.lower().strip()
    
    results = [
        item for item in local_dictionary
        if search_query in item.get('word_ar', '').lower() or \
           search_query in item.get('word_en', '').lower()
    ]
    
    formatted_results = []
    for item in results:
        image_link = item.get('image_url', '')
        formatted_results.append({
            "title": item.get("word_ar", "لا يوجد عنوان"),
            "link": image_link,
            "thumbnail_link": image_link
        })

    return JSONResponse(content={"results": formatted_results})


@app.post("/analyze-image/")
async def analyze_image(
    file: UploadFile = File(...),
    prompt_text: str = Form(
    "انت خبير بلغة الإشارة وبحياة الصم والبكم. شغلك الوحيد إنك تحلل الصور اللي إلها علاقة بالصم والبكم مثل إشارات الأيدي أو الأدوات المساعدة أو المواقف الحياتية الخاصة فيهم. ممنوع تحكي عن نصوص مكتوبة أو فواتير أو فلوس أو أي شي مالي. إذا الصورة ما إلها علاقة بالصم والبكم لازم تجاوب بجملة وحدة: هاي الصورة مش متعلقة بالصم والبكم. إذا كانت الصورة فعلاً عن الصم والبكم لازم توصف شو شايف بشكل واضح وتشرح إشارات الأيدي إذا موجودة، وتبين معناها وكيف ممكن تنفهم، وتحكي باللهجة الأردنية بشكل إنساني وبسيط كإنك تشرح لشخص عادي."
)
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="الملف المرفوع يجب أن يكون صورة.")

    try:
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))

        img_byte_arr = io.BytesIO()
        image.save(img_byte_arr, format=image.format if image.format else "JPEG")
        img_byte_arr = img_byte_arr.getvalue()

        gemini_image = {"mime_type": file.content_type, "data": img_byte_arr}

        response = await model.generate_content_async([prompt_text, gemini_image])

        if response.candidates:
            for part in response.candidates[0].content.parts:
                if hasattr(part, "text"):
                    return JSONResponse(content={"analysis_result": part.text})
            return JSONResponse(content={"analysis_result": "ما في تحليل نصي مباشر بالاستجابة."})
        else:
            return JSONResponse(content={"analysis_result": "ما قدر Gemini يولد استجابة للصورة."})

    except Exception as e:
        print("ERROR:", e)
        if hasattr(e, 'response') and hasattr(e.response, 'text'):
            detail_message = f"خطأ داخلي أثناء تحليل الصورة: {str(e)}. تفاصيل إضافية من Gemini: {e.response.text}"
        else:
            detail_message = f"خطأ داخلي أثناء تحليل الصورة: {str(e)}"
        raise HTTPException(status_code=500, detail=detail_message)