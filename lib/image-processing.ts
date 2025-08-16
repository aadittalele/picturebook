import sharp from 'sharp'

export interface ImageProcessingResult {
  originalBase64: string
  compressedBase64: string
  width: number
  height: number
  size: number
}

export async function processImage(
  imageBuffer: Buffer,
  maxWidth: number = 1024,
  maxHeight: number = 1024,
  quality: number = 80
): Promise<ImageProcessingResult> {
  try {
  console.log('[IMG] Start processing: input bytes', imageBuffer.length)
    // Get original image metadata
    const metadata = await sharp(imageBuffer).metadata()
  console.log('[IMG] Metadata', { width: metadata.width, height: metadata.height, format: metadata.format })
    
    // Process original image (resize if needed)
    const originalProcessed = await sharp(imageBuffer)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 90 })
      .toBuffer()
  console.log('[IMG] Original processed bytes', originalProcessed.length)

    // Create compressed version
    const compressed = await sharp(imageBuffer)
      .resize(512, 512, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality })
      .toBuffer()
  console.log('[IMG] Compressed processed bytes', compressed.length)

    // Convert to base64
    const originalBase64 = `data:image/jpeg;base64,${originalProcessed.toString('base64')}`
    const compressedBase64 = `data:image/jpeg;base64,${compressed.toString('base64')}`

    return {
      originalBase64,
      compressedBase64,
      width: metadata.width || 0,
      height: metadata.height || 0,
      size: originalProcessed.length
    }
  } catch (error) {
    console.error('Error processing image:', error)
    throw new Error('Failed to process image')
  }
}

export function validateImageSize(base64Image: string, maxSizeMB: number = 5): boolean {
  try {
  console.log('[IMG] Validating base64 size')
    // Remove data URL prefix if present
    const base64Data = base64Image.replace(/^data:image\/[a-z]+;base64,/, '')
    
    // Calculate size in bytes (base64 encoding increases size by ~33%)
    const sizeInBytes = (base64Data.length * 3) / 4
    const sizeInMB = sizeInBytes / (1024 * 1024)
    
    return sizeInMB <= maxSizeMB
  } catch (error) {
    console.error('Error validating image size:', error)
    return false
  }
}

// Accepts either a data URL (data:image/png;base64,...) OR a raw mime type string (image/png)
export function isValidImageFormat(input: string): boolean {
  if (!input) return false
  const validBasePrefixes = ['data:image/jpeg', 'data:image/jpg', 'data:image/png', 'data:image/webp']
  const validMime = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  // Direct match for raw mime types
  if (validMime.includes(input.toLowerCase())) return true
  // Match for data URL prefixes
  return validBasePrefixes.some(prefix => input.toLowerCase().startsWith(prefix))
}

export async function convertToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Failed to convert file to base64'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}
