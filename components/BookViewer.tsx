'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Download, Share2 } from 'lucide-react'
import { Database } from '@/lib/supabase'

type Page = Database['public']['Tables']['pages']['Row']
type Book = Database['public']['Tables']['books']['Row'] & { pages: Page[] }

interface BookViewerProps {
  book: Book
  isOwner?: boolean
  onExportPDF?: () => void
  onShare?: () => void
}

export default function BookViewer({ book, isOwner = false, onExportPDF, onShare }: BookViewerProps) {
  const [currentPage, setCurrentPage] = useState(0)
  const pages = book.pages.sort((a, b) => a.page_number - b.page_number)
  const totalPages = pages.length + 1 // +1 for cover page

  const nextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1)
    }
  }

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1)
    }
  }

  const renderCoverPage = () => (
    <div className="neo-page flex flex-col items-center justify-center text-center min-h-[600px]">
      {book.cover_image && (
        <img
          src={book.cover_image}
          alt={book.title}
          className="max-w-[300px] max-h-[300px] object-contain mb-6"
        />
      )}
      <h1 className="text-4xl font-bold mb-4 transform -rotate-1">{book.title}</h1>
      {book.description && (
        <p className="text-lg text-gray-700 max-w-md">{book.description}</p>
      )}
      <div className="mt-8 bg-yellow-200 px-4 py-2 transform rotate-1">
        <p className="font-bold">A Picture Book Adventure</p>
      </div>
    </div>
  )

  const renderStoryPage = (page: Page) => (
    <div className="neo-page min-h-[600px] flex flex-col">
      {/* Page Number */}
      <div className="text-right mb-4">
        <span className="bg-black text-white px-3 py-1 font-bold transform rotate-2 inline-block">
          Page {page.page_number}
        </span>
      </div>

      {/* Page Content */}
      <div className="flex-1 grid md:grid-cols-2 gap-6">
        {/* Image */}
        <div className="flex items-center justify-center">
          {page.image_url || page.image_compressed ? (
            <img
              src={page.image_compressed || page.image_url!}
              alt={page.title || 'Page illustration'}
              className="max-w-full max-h-[400px] object-contain border-4 border-black"
            />
          ) : (
            null
          )}
        </div>

        {/* Text */}
        <div className="flex flex-col justify-center">
          {page.title && (
            <h2 className="text-2xl font-bold mb-4 bg-yellow-200 px-4 py-2 transform -rotate-1 inline-block">
              {page.title}
            </h2>
          )}
          {page.content && (
            <div className="text-lg leading-relaxed">
              {page.content.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-3">
                  {paragraph}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{book.title}</h1>
        <div className="flex gap-4 mt-3">
          {onShare && (
            <button
              onClick={onShare}
              className="neo-btn flex items-center gap-2"
            >
              <span className="flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                Share
              </span>
            </button>
          )}
          {onExportPDF && (
            <button
              onClick={onExportPDF}
              className="neo-btn neo-primary flex items-center gap-2"
            >
              <span className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export PDF
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Page Display */}
      <div className="mb-6">
        {currentPage === 0 
          ? renderCoverPage()
          : renderStoryPage(pages[currentPage - 1])
        }
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={prevPage}
          disabled={currentPage === 0}
          className={`neo-btn ${
            currentPage === 0 ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <span className="flex items-center gap-2">
            <ChevronLeft className="w-4 h-4" />
            Previous
          </span>
        </button>

        <div className="flex items-center gap-4">
          <span className="font-bold">
            Page {currentPage} of {totalPages - 1}
          </span>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={`w-3 h-3 border-2 border-black ${
                  i === currentPage ? 'bg-black' : 'bg-white'
                } hover:bg-gray-300 transition-colors`}
              />
            ))}
          </div>
        </div>

        <button
          onClick={nextPage}
          disabled={currentPage === totalPages - 1}
          className={`neo-btn flex items-center gap-2 ${
            currentPage === totalPages - 1 ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <span className="flex items-center gap-2">
            Next
            <ChevronRight className="w-4 h-4" />
          </span>
        </button>
      </div>
    </div>
  )
}
