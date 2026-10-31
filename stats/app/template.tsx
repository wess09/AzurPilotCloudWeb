'use client'

import { ViewTransition } from 'react'

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition name="statistics-page" enter="auto" share="auto" default="none">
      <div>{children}</div>
    </ViewTransition>
  )
}
