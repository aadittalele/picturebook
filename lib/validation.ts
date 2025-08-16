export const CONSTRAINTS = {
  MIN_PAGES: 1,
  MAX_PAGES: 20,
  MAX_IMAGE_SIZE_MB: 5,
  IMAGE_RESOLUTION: {
    width: 1024,
    height: 1024
  },
  MAX_TITLE_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_PAGE_CONTENT_LENGTH: 1000,
  MAX_PAGE_TITLE_LENGTH: 50
} as const

export function validatePageCount(count: number): boolean {
  return count >= CONSTRAINTS.MIN_PAGES && count <= CONSTRAINTS.MAX_PAGES
}

export function validateBookTitle(title: string): { isValid: boolean; error?: string } {
  if (!title || title.trim().length === 0) {
    return { isValid: false, error: 'Title is required' }
  }
  if (title.length > CONSTRAINTS.MAX_TITLE_LENGTH) {
    return { isValid: false, error: `Title must be ${CONSTRAINTS.MAX_TITLE_LENGTH} characters or less` }
  }
  return { isValid: true }
}

export function validateBookDescription(description?: string): { isValid: boolean; error?: string } {
  if (description && description.length > CONSTRAINTS.MAX_DESCRIPTION_LENGTH) {
    return { isValid: false, error: `Description must be ${CONSTRAINTS.MAX_DESCRIPTION_LENGTH} characters or less` }
  }
  return { isValid: true }
}

export function validatePageTitle(title?: string): { isValid: boolean; error?: string } {
  if (title && title.length > CONSTRAINTS.MAX_PAGE_TITLE_LENGTH) {
    return { isValid: false, error: `Page title must be ${CONSTRAINTS.MAX_PAGE_TITLE_LENGTH} characters or less` }
  }
  return { isValid: true }
}

export function validatePageContent(content?: string): { isValid: boolean; error?: string } {
  if (content && content.length > CONSTRAINTS.MAX_PAGE_CONTENT_LENGTH) {
    return { isValid: false, error: `Page content must be ${CONSTRAINTS.MAX_PAGE_CONTENT_LENGTH} characters or less` }
  }
  return { isValid: true }
}

export function validatePageNumber(pageNumber: number, bookPageCount: number): { isValid: boolean; error?: string } {
  if (pageNumber < 1) {
    return { isValid: false, error: 'Page number must be at least 1' }
  }
  if (pageNumber > CONSTRAINTS.MAX_PAGES) {
    return { isValid: false, error: `Page number cannot exceed ${CONSTRAINTS.MAX_PAGES}` }
  }
  if (pageNumber > bookPageCount + 1) {
    return { isValid: false, error: 'Page number cannot skip numbers' }
  }
  return { isValid: true }
}

export function validateImageFile(file: File): { isValid: boolean; error?: string } {
  // Check file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!validTypes.includes(file.type)) {
    return { isValid: false, error: 'Invalid file type. Please upload JPEG, PNG, or WebP images' }
  }

  // Check file size
  const maxSizeBytes = CONSTRAINTS.MAX_IMAGE_SIZE_MB * 1024 * 1024
  if (file.size > maxSizeBytes) {
    return { isValid: false, error: `Image must be ${CONSTRAINTS.MAX_IMAGE_SIZE_MB}MB or less` }
  }

  return { isValid: true }
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>\"'&]/g, (match) => {
    const entities: { [key: string]: string } = {
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '&': '&amp;'
    }
    return entities[match] || match
  })
}

export function validateStoryText(text: string): { isValid: boolean; error?: string } {
  if (!text || text.trim().length === 0) {
    return { isValid: false, error: 'Story text is required' }
  }
  if (text.length < 50) {
    return { isValid: false, error: 'Story text must be at least 50 characters long' }
  }
  if (text.length > 10000) {
    return { isValid: false, error: 'Story text must be 10,000 characters or less' }
  }
  return { isValid: true }
}
