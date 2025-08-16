'use client'

import { useState, useEffect } from 'react'
import { X, Upload, Sparkles } from 'lucide-react'

interface PageEditorProps {
  pageNumber: number
  title: string
  content: string
  imageUrl?: string
  onSave: (data: { title: string; content: string; imageUrl?: string }) => void
  onCancel: () => void
  onGenerateImage: (prompt: string) => void
  onUploadImage: (file: File) => void
}

export default function PageEditor({
  pageNumber,
  title: initialTitle,
  content: initialContent,
  imageUrl: initialImageUrl,
  onSave,
  onCancel,
  onGenerateImage,
  onUploadImage
}: PageEditorProps) {
  const [title, setTitle] = useState(initialTitle)
  const [content, setContent] = useState(initialContent)
  const [imageUrl, setImageUrl] = useState(initialImageUrl)
  const [imagePrompt, setImagePrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  // Sync local state with props when they change (only if actually different)
  useEffect(() => {
    if (title !== initialTitle) {
      console.log('[PageEditor] Title updated:', initialTitle)
      setTitle(initialTitle)
    }
    if (content !== initialContent) {
      console.log('[PageEditor] Content updated:', initialContent)
      setContent(initialContent)
    }
    if (imageUrl !== initialImageUrl) {
      console.log('[PageEditor] Image URL updated:', initialImageUrl)
      setImageUrl(initialImageUrl)
    }
  }, [initialTitle, initialContent, initialImageUrl, title, content, imageUrl])

  // Debug component lifecycle
  useEffect(() => {
    console.log('[PageEditor] Component mounted/remounted')
    return () => {
      console.log('[PageEditor] Component unmounting')
    }
  }, [])

  const handleSave = () => {
    onSave({ title, content, imageUrl })
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onUploadImage(file)
    }
  }

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return
    setIsGenerating(true)
    try {
      await onGenerateImage(imagePrompt)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="neo-modal max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Edit Page {pageNumber}</h2>
          <button
            onClick={onCancel}
            className="neo-btn neo-danger p-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Text Content */}
          <div className="space-y-4">
            <div>
              <label className="block font-bold mb-2">Page Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter page title..."
                className="neo-input"
                maxLength={50}
              />
            </div>

            <div>
              <label className="block font-bold mb-2">Page Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter page content..."
                className="neo-textarea h-32"
                maxLength={200}
              />
              <div className="text-sm text-gray-600 mt-1">
                {content.length}/200 characters
              </div>
            </div>

            <div className="space-y-2">
              <label className="block font-bold mb-2">Generate Image with AI</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="Describe the image..."
                  className="neo-input flex-1"
                />
                <button
                  onClick={handleGenerateImage}
                  disabled={isGenerating || !imagePrompt.trim()}
                  className="neo-btn neo-primary flex gap-2"
                >
                  {isGenerating ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold mb-2">Or Upload Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="neo-btn  gap-2 cursor-pointer inline-flex"
              >
                <span className="flex items-center">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Image
                </span>
              </label>
            </div>
          </div>

          {/* Image Preview */}
          <div className="space-y-4">
            <label className="block font-bold mb-2">Image Preview</label>
            <div className="neo-card min-h-[300px] flex items-center justify-center">
              {imageUrl ? (
                <div>
                  <img
                    src={imageUrl}
                    alt="Page illustration"
                    className="max-w-full max-h-[400px] object-contain"
                    onLoad={() => console.log('[PageEditor] Image loaded successfully')}
                    onError={(e) => console.error('[PageEditor] Image load error:', e)}
                  />
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Image URL length: {imageUrl.length} chars
                  </p>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <Upload className="w-12 h-12 mx-auto mb-2" />
                  <p>No image selected</p>
                  <p className="text-sm">Upload an image or generate one with AI</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-4 mt-6">
          <button
            onClick={handleSave}
            className="neo-btn neo-success flex-1"
          >
            Save Page
          </button>
          <button
            onClick={onCancel}
            className="neo-btn flex-1"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
