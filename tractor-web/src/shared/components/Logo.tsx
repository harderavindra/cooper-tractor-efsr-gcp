import logoSrc from '../../assets/logo.svg'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showWordmark?: boolean
}

const sizes = { sm: 28, md: 36, lg: 48 }

export default function Logo({ size = 'md', showWordmark = true }: LogoProps) {
  const px = sizes[size]
  return (
    <div className="flex items-center gap-2 overflow-hidden">
      <img src={logoSrc} alt="Logo" width={px} height={px} className="shrink-0" />
      {showWordmark && (
        <p className="flex flex-col gap-0">
        <span className="text-lg font-semibold text-[#1E1951] whitespace-nowrap leading-[24px]">
          Cooper Corp
        </span>
           <span className="text-sm  text-[#e76223] whitespace-nowrap leading-[24px]">
          Tractor eFSR V0.02
        </span>
        </p>
      )}
    </div>
  )
}
