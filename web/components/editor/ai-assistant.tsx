"use client"

import { useState } from "react"
import { Sparkles, X, Copy, Wand2 } from "lucide-react"
import { JSONContent } from "@tiptap/core" // Import JSONContent

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"

interface AiAssistantProps {
  onClose: () => void
  onSuggestion: (suggestion: JSONContent) => void // suggestion now expects JSONContent
  currentContent: string
}

const defaultContent: JSONContent = { // Define your default content
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Start writing here...",
        },
      ],
    },
  ],
};

export function AiAssistant({ onClose, onSuggestion, currentContent }: AiAssistantProps) {
  const { toast } = useToast()
  const [prompt, setPrompt] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<JSONContent | null>(null)
  const [activeTab, setActiveTab] = useState("write")

  async function generateContent() {
    const trimmedPrompt = prompt.trim(); // Trim the prompt
    if (!trimmedPrompt) {
      toast({
        title: "Error",
        description: "Please enter a prompt.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: trimmedPrompt,
          currentContent, // Keep passing the raw string
          mode: activeTab,
        }),
      });

      if (!response.ok) {
        console.error("AI generation failed:", response.status, response.statusText);
        const errorData = await response.json();
        throw new Error(errorData?.error || "Failed to generate content");
      }

      const data = await response.json();
      if (data?.content) {
        setResult(data.content); // Expecting 'content' as JSONContent now
      } else {
        throw new Error("Invalid response format from AI API: Missing 'content'");
      }
    } catch (error: any) {
      console.error("AI generation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleInsert() {
    if (result) {
      onSuggestion(result);
      onClose();
    } else {
      toast({
        title: "Error",
        description: "No content generated to insert.",
        variant: "destructive",
      });
    }
  }

  function handleCopy() {
    if (result) {
      try {
        const jsonString = JSON.stringify(result, null, 2); // Pretty print for readability
        navigator.clipboard.writeText(jsonString);
        toast({
          title: "Copied",
          description: "Content copied to clipboard as JSON.",
        });
      } catch (copyError: any) {
        console.error("Clipboard copy error:", copyError);
        toast({
          title: "Error",
          description: "Failed to copy content to clipboard.",
          variant: "destructive",
        });
      }
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Sparkles className="mr-2 h-4 w-4" />
            AI Writing Assistant
          </DialogTitle>
          <Button variant="ghost" size="icon" className="absolute right-4 top-4" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="write">Write</TabsTrigger>
            <TabsTrigger value="improve">Improve</TabsTrigger>
            <TabsTrigger value="image">Generate Image</TabsTrigger>
          </TabsList>

          <TabsContent value="write" className="space-y-4 py-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">What would you like to write?</h3>
              <Input
                placeholder="e.g., Write an introduction about artificial intelligence"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>
          </TabsContent>

          <TabsContent value="improve" className="space-y-4 py-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">How would you like to improve your text?</h3>
              <Input
                placeholder="e.g., Make it more professional, fix grammar, etc."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>
          </TabsContent>

          <TabsContent value="image" className="space-y-4 py-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Describe the image you want to generate</h3>
              <Input
                placeholder="e.g., A serene mountain landscape at sunset"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>
          </TabsContent>
        </Tabs>

        <Button onClick={generateContent} disabled={isLoading} className="w-full">
          {isLoading ? (
            "Generating..."
          ) : (
            <>
              <Wand2 className="mr-2 h-4 w-4" />
              Generate with AI
            </>
          )}
        </Button>

        {result && (
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-medium">Result:</h3>
            <div className="relative">
              <Textarea value={JSON.stringify(result, null, 2)} readOnly className="h-[200px] resize-none" />
              <Button variant="ghost" size="icon" className="absolute right-2 top-2" onClick={handleCopy}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleInsert} disabled={!result}>
            Insert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}