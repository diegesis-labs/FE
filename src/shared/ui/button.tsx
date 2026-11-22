import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'
import { Slot } from 'radix-ui'

// 디자인 시스템 4.1 버튼: 각진 모서리, 그림자 없음, 색만 0.25초 전환. 포커스 표시는 전역 :focus-visible(4.6)을 쓴다.
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-none text-sm font-medium whitespace-nowrap no-underline transition-colors duration-250 ease-out disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary-hover',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        // 보조 버튼: hover 때 기본 버튼처럼 반전된다.
        outline:
          'border border-input bg-transparent hover:border-transparent hover:bg-primary hover:text-primary-foreground',
        // 브랜드 포인트 버튼: 한 화면에 하나 이하로만 쓴다.
        brand: 'bg-brand text-brand-foreground hover:bg-brand-hover',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-accent',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'h-auto px-0 text-foreground underline underline-offset-2 hover:decoration-2',
      },
      size: {
        default: 'h-11 px-6 has-[>svg]:px-5',
        xs: "h-7 gap-1 px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: 'h-9 gap-1.5 px-4 text-xs',
        lg: 'h-12 px-8',
        icon: 'size-10',
        'icon-xs': "size-7 [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-8',
        'icon-lg': 'size-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : 'button'

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
