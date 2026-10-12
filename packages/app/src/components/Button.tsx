import type { ButtonHTMLAttributes } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'md' | 'lg'
  block?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  block,
  className,
  type = 'button',
  ...rest
}: Props) {
  const cls = ['btn', `btn-${variant}`, size === 'lg' && 'btn-lg', block && 'btn-block', className]
    .filter(Boolean)
    .join(' ')
  return <button type={type} className={cls} {...rest} />
}
