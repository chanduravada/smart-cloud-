import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-version",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileName, mimeType, size, content } = await req.json();

    // Always compute extension first — needed for fallback even if AI is unavailable
    const extension = fileName.split('.').pop()?.toLowerCase() || 'unknown';
    const sizeInMB = (size / (1024 * 1024)).toFixed(2);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      // No AI key — use extension-based fallback so files are still categorised correctly
      console.log("No LOVABLE_API_KEY, using fallback for:", fileName);
      return new Response(JSON.stringify(getFallbackClassification(extension)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let prompt = `Classify this file and provide metadata:
File name: ${fileName}
File type: ${extension}
MIME type: ${mimeType}
Size: ${sizeInMB} MB`;

    // Add content excerpt if available (for text files)
    if (content) {
      const contentExcerpt = content.substring(0, 1000);
      prompt += `\n\nContent excerpt:\n${contentExcerpt}`;
    }

    prompt += `

Based on this information, classify the file into one of these categories:
- document (PDFs, Word docs, text files, etc.)
- image (photos, graphics, screenshots)
- report (spreadsheets, data files, presentations)
- audio (music, podcasts, voice recordings — mp3, wav, aac, flac, ogg, m4a, etc.)
- video (movies, clips, screen recordings — mp4, mov, avi, mkv, webm, etc.)
- other (anything else)

Also generate 3-5 relevant tags that describe the file content.

Respond in JSON format only:
{
  "category": "document|image|report|audio|video|other",
  "tags": ["tag1", "tag2", "tag3"],
  "confidence": 0.0 to 1.0,
  "description": "Brief description of the file"
}`;

    console.log("Classifying file:", fileName);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are a file classification AI. Analyze files and return structured JSON metadata. Be accurate and concise. Always respond with valid JSON only, no markdown formatting.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded");
        // Return fallback classification
        return new Response(JSON.stringify(getFallbackClassification(extension)), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      // Return fallback classification
      return new Response(JSON.stringify(getFallbackClassification(extension)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await response.json();
    const content_response = aiResponse.choices?.[0]?.message?.content;

    if (!content_response) {
      console.error("No content in AI response");
      return new Response(JSON.stringify(getFallbackClassification(extension)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse the AI response
    let classification;
    try {
      // Remove any markdown code block formatting
      const cleanedContent = content_response.replace(/```json\n?|\n?```/g, '').trim();
      classification = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content_response);
      classification = getFallbackClassification(extension);
    }

    // Validate and sanitize the response
    const validCategories = ['document', 'image', 'report', 'audio', 'video', 'other'];
    if (!validCategories.includes(classification.category)) {
      classification.category = 'other';
    }

    if (!Array.isArray(classification.tags)) {
      classification.tags = [extension];
    }

    if (typeof classification.confidence !== 'number') {
      classification.confidence = 0.8;
    }

    console.log("Classification result:", classification);

    return new Response(JSON.stringify(classification), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Classification error:", error);

    return new Response(JSON.stringify({
      category: "other",
      tags: ["unclassified"],
      confidence: 0.5,
      description: "Classification failed, using fallback",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getFallbackClassification(extension: string) {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'avif'];
  const documentExtensions = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'md'];
  const reportExtensions = ['xls', 'xlsx', 'csv', 'ppt', 'pptx', 'ods', 'odp'];
  const audioExtensions = ['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a', 'wma', 'opus', 'aiff'];
  const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv', 'flv', 'm4v', '3gp', 'ts'];

  let category = 'other';
  if (imageExtensions.includes(extension)) category = 'image';
  else if (documentExtensions.includes(extension)) category = 'document';
  else if (reportExtensions.includes(extension)) category = 'report';
  else if (audioExtensions.includes(extension)) category = 'audio';
  else if (videoExtensions.includes(extension)) category = 'video';

  return {
    category,
    tags: [extension, category],
    confidence: 0.7,
    description: `Fallback classification for ${extension} file`,
  };
}
