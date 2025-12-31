import { CSSProperties } from "react"
import { VerticalAlignmentType } from "./types"

export const getContainerStyleForVerticalAlign = (verticalAlign: VerticalAlignmentType) => {
  const containerStyle: CSSProperties = {
    alignItems: 'center',
  }

  if (verticalAlign === 'top') {
    containerStyle.paddingTop = 150
  }

  if (verticalAlign === 'bottom') {
    containerStyle.paddingBottom = 150
    containerStyle.justifyContent = 'flex-end'
  }

  if (verticalAlign === 'center') {
    containerStyle.justifyContent = 'center'
  }

  return containerStyle
}