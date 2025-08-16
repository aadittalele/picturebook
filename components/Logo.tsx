'use client'

import Link from 'next/link'
import { BookOpen } from 'lucide-react'

interface LogoProps {
  className?: string
  showText?: boolean
  text?: string
}

export default function Logo({ className = '', showText = true, text = 'PictureBook' }: LogoProps) {
  return (
    <Link href="/" className={`flex items-center gap-2 hover:opacity-80 transition-opacity ${className}`}>
      <BookOpen className="w-8 h-8" />
      {showText && (
        <h1 className="text-2xl font-bold">{text}</h1>
      )}
    </Link>
  )
}
