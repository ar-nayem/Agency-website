'use client'

import { Suspense } from 'react'
import MessagesContent from './MessagesContent'

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="max-w-6xl mx-auto h-[calc(100vh-4rem)] flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading messages...</p>
        </div>
      </div>
    }>
      <MessagesContent />
    </Suspense>
  )
}
