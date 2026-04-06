import { Mark, mergeAttributes } from '@tiptap/core'

export interface ClauseMarkOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    clauseMark: {
      setClauseMark: (clauseId: string, riskLevel: string) => ReturnType
      unsetClauseMark: (clauseId: string) => ReturnType
    }
  }
}

const ClauseMark = Mark.create<ClauseMarkOptions>({
  name: 'clauseMark',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      'data-clause-id': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-clause-id'),
        renderHTML: (attributes) => {
          if (!attributes['data-clause-id']) return {}
          return { 'data-clause-id': attributes['data-clause-id'] }
        },
      },
      'data-risk-level': {
        default: 'LOW',
        parseHTML: (element) => element.getAttribute('data-risk-level'),
        renderHTML: (attributes) => {
          return { 'data-risk-level': attributes['data-risk-level'] }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'mark[data-clause-id]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const riskLevel = HTMLAttributes['data-risk-level'] || 'LOW'
    const riskClass = `risk-mark-${riskLevel.toLowerCase()}`
    return [
      'mark',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: `clause-mark ${riskClass}`,
      }),
      0,
    ]
  },

  addCommands() {
    return {
      setClauseMark:
        (clauseId: string, riskLevel: string) =>
        ({ commands }) => {
          return commands.setMark(this.name, {
            'data-clause-id': clauseId,
            'data-risk-level': riskLevel,
          })
        },
      unsetClauseMark:
        (clauseId: string) =>
        ({ tr, state, dispatch }) => {
          const { doc } = state
          let found = false

          doc.descendants((node, pos) => {
            if (!node.isText) return
            const mark = node.marks.find(
              (m) =>
                m.type.name === this.name &&
                m.attrs['data-clause-id'] === clauseId
            )
            if (mark) {
              found = true
              if (dispatch) {
                tr.removeMark(pos, pos + node.nodeSize, mark.type)
              }
            }
          })

          return found
        },
    }
  },
})

export default ClauseMark
