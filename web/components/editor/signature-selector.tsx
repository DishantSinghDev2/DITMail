"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"

interface Signature {
  _id: string
  name: string
  html: string
  is_default: boolean
}

interface SignatureSelectorProps {
  selectedSignature: string | null
  onSignatureChange: (signatureId: string | null, html: string) => void
}

export default function SignatureSelector({ selectedSignature, onSignatureChange }: SignatureSelectorProps) {
  const [signatures, setSignatures] = useState<Signature[]>([])

  useEffect(() => {
    const loadSignatures = async () => {
      try {
        const token = localStorage.getItem("accessToken")
        const response = await fetch("/api/signatures", {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (response.ok) {
          const data = await response.json()
          setSignatures(data.signatures)

          // Auto-select default signature
          const defaultSig = data.signatures.find((sig: Signature) => sig.is_default)
          if (defaultSig && !selectedSignature) {
            onSignatureChange(defaultSig._id, defaultSig.html)
          }
        }
      } catch (error) {
        console.error("Error loading signatures:", error)
      }
    }

    loadSignatures()
  }, [selectedSignature, onSignatureChange])

  const selectedSig = signatures.find((sig) => sig._id === selectedSignature)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs text-gray-600 hover:text-gray-800">
          {selectedSig ? selectedSig.name : "No signature"}
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => onSignatureChange(null, "")}>No signature</DropdownMenuItem>
        {signatures.map((signature) => (
          <DropdownMenuItem key={signature._id} onClick={() => onSignatureChange(signature._id, signature.html)}>
            {signature.name}
            {signature.is_default && <span className="ml-2 text-xs text-blue-600">(Default)</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
