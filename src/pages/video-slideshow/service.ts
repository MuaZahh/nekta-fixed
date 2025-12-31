import { z } from 'zod'

export const SlideshowSlides = z.object({
  slides: z.array(
    z.object({
      title: z.string(),
      content: z.string(),
      imageDescription: z.string(),
    })
  ),
})

export const getGenerateSlideshowPrompt = (description: string) => {
  const prompt = `You are a helpful assistant that generates slideshow content.

Based on the following description, generate 5-8 slides for a video slideshow. Each slide should have:
- A short, catchy title (3-6 words)
- Content text (1-2 sentences, informative and engaging)
- A detailed image description for AI image generation

The slideshow should tell a cohesive story or present information in a logical flow.

**IMAGE DESCRIPTION REQUIREMENTS**:
- Be very detailed and specific
- Describe the scene, colors, lighting, mood
- Include style hints (cinematic, professional, vibrant, etc.)
- Make each image visually distinct but thematically connected

Return the result as JSON:
{
  "slides": [
    {
      "title": "...",
      "content": "...",
      "imageDescription": "..."
    }
  ]
}

<description>
${description}
</description>`

  return prompt
}
