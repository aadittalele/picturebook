import jsPDF from 'jspdf'
import { Database } from './supabase'

type Book = Database['public']['Tables']['books']['Row']
type Page = Database['public']['Tables']['pages']['Row']

export interface BookWithPages extends Book {
  pages: Page[]
}

export async function generateBookPDF(book: BookWithPages): Promise<Blob> {
  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 20
    const contentWidth = pageWidth - (margin * 2)
    const contentHeight = pageHeight - (margin * 2)

    // Add cover page
    pdf.setFontSize(24)
    pdf.setFont('helvetica', 'bold')
    
    // Title
    const titleLines = pdf.splitTextToSize(book.title, contentWidth)
    let yPosition = margin + 30
    titleLines.forEach((line: string) => {
      pdf.text(line, pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 10
    })

    // Cover image if available
    if (book.cover_image) {
      try {
        const imgData = book.cover_image
        const imgWidth = contentWidth * 0.6
        const imgHeight = (imgWidth * 3) / 4 // 4:3 aspect ratio
        const imgX = (pageWidth - imgWidth) / 2
        const imgY = yPosition + 20
        
        if (imgY + imgHeight < pageHeight - margin) {
          pdf.addImage(imgData, 'JPEG', imgX, imgY, imgWidth, imgHeight)
        }
      } catch (error) {
        console.warn('Failed to add cover image:', error)
      }
    }

    // Description
    if (book.description) {
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'normal')
      const descLines = pdf.splitTextToSize(book.description, contentWidth)
      yPosition = pageHeight - margin - (descLines.length * 6)
      descLines.forEach((line: string) => {
        pdf.text(line, pageWidth / 2, yPosition, { align: 'center' })
        yPosition += 6
      })
    }

    // Add story pages
    book.pages.sort((a, b) => a.page_number - b.page_number).forEach((page, index) => {
      pdf.addPage()
      
      let currentY = margin + 10

      // Page number
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`${page.page_number}`, pageWidth - margin, margin, { align: 'right' })

      // Page title
      if (page.title) {
        pdf.setFontSize(16)
        pdf.setFont('helvetica', 'bold')
        const titleLines = pdf.splitTextToSize(page.title, contentWidth)
        titleLines.forEach((line: string) => {
          pdf.text(line, margin, currentY)
          currentY += 8
        })
        currentY += 5
      }

      // Page image
      if (page.image_compressed || page.image_url) {
        try {
          const imgData = page.image_compressed || page.image_url!
          const imgWidth = contentWidth * 0.8
          const imgHeight = (imgWidth * 3) / 4
          const imgX = (pageWidth - imgWidth) / 2
          
          if (currentY + imgHeight < pageHeight - margin - 40) {
            pdf.addImage(imgData, 'JPEG', imgX, currentY, imgWidth, imgHeight)
            currentY += imgHeight + 10
          }
        } catch (error) {
          console.warn(`Failed to add image for page ${page.page_number}:`, error)
        }
      }

      // Page content
      if (page.content) {
        pdf.setFontSize(12)
        pdf.setFont('helvetica', 'normal')
        const contentLines = pdf.splitTextToSize(page.content, contentWidth)
        
        contentLines.forEach((line: string) => {
          if (currentY + 6 > pageHeight - margin) {
            pdf.addPage()
            currentY = margin + 10
          }
          pdf.text(line, margin, currentY)
          currentY += 6
        })
      }
    })

    // Convert to blob
    const pdfOutput = pdf.output('blob')
    return pdfOutput
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw new Error('Failed to generate PDF')
  }
}

export function downloadPDF(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
