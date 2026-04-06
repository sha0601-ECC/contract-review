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
import { useEffect, useCallback, useRef } from 'react'
import { ClauseMark } from '../extensions'
import { ClauseSuggestion } from '../services/api'

interface LeftPaneProps {
  content: string
  onChange: (html: string) => void
  highlightedClauseId: string | null
  clauses: ClauseSuggestion[]
  onImageDelete?: (src: string) => void
  editable?: boolean
}

export default function LeftPane({
  content,
  onChange,
  highlightedClauseId,
  clauses,
  onImageDelete,
  editable = true,
}: LeftPaneProps) {
  const editorRef = useRef<ReturnType<typeof useEditor>>(null)
  const prevClausesLength = useRef(0)

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
      ClauseMark,
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  editorRef.current = editor

  // Update content when prop changes
  useEffect(() => {
    if (editor && content && editor.getHTML() !== content) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  // Apply clause marks when clauses are received from analysis
  useEffect(() => {
    if (!editor || clauses.length === 0) return
    if (clauses.length === prevClausesLength.current) return
    prevClausesLength.current = clauses.length

    // Apply marks for each clause that has clause_text
    clauses.forEach((clause) => {
      if (!clause.clause_text) return

      // Find and mark the text in editor
      const doc = editor.state.doc
      const searchText = clause.clause_text.slice(0, 100) // First 100 chars for matching
      let found = false

      doc.descendants((node, pos) => {
        if (found || !node.isText) return
        if (node.text?.includes(searchText)) {
          // Mark this text range
          const textContent = node.text
          const startIdx = textContent.indexOf(searchText)
          const from = pos + startIdx
          const to = pos + startIdx + searchText.length

          editor
            .chain()
            .setTextSelection({ from, to })
            .setClauseMark(clause.clause_id, clause.risk_level)
            .run()

          found = true
        }
      })
    })
  }, [editor, clauses])

  // Scroll to and highlight when highlightedClauseId changes
  useEffect(() => {
    if (!editor || !highlightedClauseId) return

    // Find the mark with this clause ID
    const { state } = editor
    const marks: { from: number; to: number } | null = null

    state.doc.descendants((node, pos) => {
      if (!node.isText) return
      const mark = node.marks.find(
        (m) =>
          m.type.name === 'clauseMark' &&
          m.attrs['data-clause-id'] === highlightedClauseId
      )
      if (mark) {
        const from = pos
        const to = pos + node.nodeSize
        editor.commands.setTextSelection({ from, to })
        editor.commands.scrollIntoView()
      }
    })
  }, [editor, highlightedClauseId])

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
      <div className="flex-1 overflow-y-auto bg-white" onPaste={handlePaste}>
        <EditorContent editor={editor} className="prose prose-sm max-w-none p-4" />
      </div>
    </div>
  )
}
