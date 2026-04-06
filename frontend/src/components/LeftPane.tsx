import { useEditor, EditorContent } from '@tiptap/react'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import Heading from '@tiptap/extension-heading'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import Underline from '@tiptap/extension-underline'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import ListItem from '@tiptap/extension-list-item'
import Blockquote from '@tiptap/extension-blockquote'
import Image from '@tiptap/extension-image'
import Highlight from '@tiptap/extension-highlight'
import Placeholder from '@tiptap/extension-placeholder'
import History from '@tiptap/extension-history'
import { useEffect, useCallback } from 'react'

interface LeftPaneProps {
  content: string
  onChange: (html: string) => void
  highlightedClauseId?: string | null
  onImageDelete?: (src: string) => void
  editable?: boolean
}

export default function LeftPane({
  content,
  onChange,
  highlightedClauseId,
  onImageDelete,
  editable = true,
}: LeftPaneProps) {
  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      Heading,
      Bold,
      Italic,
      Underline,
      BulletList,
      OrderedList,
      ListItem,
      Blockquote,
      Highlight.configure({ multicolor: true }),
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'contract-image',
        },
      }),
      Placeholder.configure({
        placeholder: '上传合同后，文本将显示在这里...',
      }),
      History,
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  // Update content when prop changes
  useEffect(() => {
    if (editor && content && editor.getHTML() !== content) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  // Handle image right-click delete
  useEffect(() => {
    if (!editor || !onImageDelete) return

    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'IMG') {
        e.preventDefault()
        const src = (target as HTMLImageElement).src
        if (confirm('确定要删除这张图片吗？')) {
          onImageDelete(src)
          // Remove the image node
          const { state } = editor
          const pos = editor.view.posAtDOM(target, 0)
          editor.view.dispatch(state.tr.delete(pos, pos + 1))
        }
      }
    }

    const dom = editor.view.dom
    dom.addEventListener('contextmenu', handleContextMenu)
    return () => dom.removeEventListener('contextmenu', handleContextMenu)
  }, [editor, onImageDelete])

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items || !editor) return

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const file = item.getAsFile()
          if (!file) continue

          const reader = new FileReader()
          reader.onload = (ev) => {
            const b64 = ev.target?.result as string
            // Insert as base64 image
            const src = b64.split(',')[1]
            editor.chain().focus().setImage({ src: b64 }).run()
          }
          reader.readAsDataURL(file)
          return
        }
      }
    },
    [editor]
  )

  if (!editor) return null

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b bg-gray-50 flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">原文编辑</span>
        {editable && (
          <span className="text-xs text-gray-400">
            右键点击图片可删除 | 直接粘贴可插入图片
          </span>
        )}
      </div>
      <div
        className="flex-1 overflow-y-auto bg-white"
        onPaste={handlePaste}
      >
        <EditorContent editor={editor} className="prose prose-sm max-w-none p-4" />
      </div>
    </div>
  )
}
