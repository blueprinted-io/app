import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-base text-gray-900 transition-colors outline-none placeholder:text-gray-400 focus-visible:border-blue-500 focus-visible:ring-3 focus-visible:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-red-500 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
