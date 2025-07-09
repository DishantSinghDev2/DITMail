"use client"

import type React from "react"

import { useState, useRef } from "react"
import { X, Upload, ImageIcon } from "lucide-react"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

interface ImageUploaderProps {
  onClose: () => void
  onImageUploaded: (url: string) => void
}

export function ImageUploader({ onClose, onImageUploaded }: ImageUploaderProps) {
  const { toast } = useToast()
  const [isUploading, setIsUploading] = useState(false)
  const [imageUrl, setImageUrl] = useState("")
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

    async function uploadImage(file: File) {
    setIsUploading(true);
    setUploadProgress(0);
  
    try {
      // Convert file to base64 using a Promise
      const base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
  
        reader.onload = () => {
          resolve(reader.result as string);
        };
  
        reader.onerror = () => {
          reject(new Error("Failed to read file"));
        };
      });
  
      // Extract the base64 data (remove the data:image/jpeg;base64, part)
      const base64Data = base64Image.split(",")[1];
  
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);
  
      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image: base64Data,
            name: file.name,
          }),
        });
  
        clearInterval(progressInterval);
  
        if (!response.ok) {
          throw new Error("Failed to upload image");
        }
  
        const data = await response.json();
        setUploadProgress(100);
        setImageUrl(data.url);
  
        toast({
          title: "Success",
          description: "Image uploaded successfully",
        });
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      uploadImage(file)
    }
  }

  function handleInsert() {
    if (imageUrl) {
      onImageUploaded(imageUrl)
      onClose()
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <ImageIcon className="mr-2 h-4 w-4" />
            Upload Image
          </DialogTitle>
          <Button variant="ghost" size="icon" className="absolute right-4 top-4" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-md p-6">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

            {isUploading ? (
              <div className="w-full space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-primary h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              </div>
            ) : imageUrl ? (
              <div className="space-y-4">
                <img
                  src={imageUrl || "/placeholder.svg"}
                  alt="Uploaded"
                  className="max-h-[200px] max-w-full object-contain"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    setImageUrl("")
                    if (fileInputRef.current) {
                      fileInputRef.current.value = ""
                    }
                  }}
                >
                  Upload Another
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Drag and drop an image, or click to select</p>
                  <p className="text-xs text-gray-400">PNG, JPG, GIF up to 10MB</p>
                </div>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  Select Image
                </Button>
              </div>
            )}
          </div>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleInsert} disabled={!imageUrl || isUploading}>
            Use Image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
