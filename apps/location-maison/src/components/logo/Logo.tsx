import React from 'react'
import { cn } from '@/lib/utils';

export default function Logo({ className, color }: { className?: string, color?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" version="1.0" width="64" height="64" viewBox="0 0 256.000000 256.000000" preserveAspectRatio="xMidYMid meet">
      <g transform="translate(0.000000,256.000000) scale(0.100000,-0.100000)" fill={color || '#146B67'} stroke="none">
        <path d="M1112 2095 c-159 -37 -286 -107 -403 -224 -139 -140 -219 -303 -238 -490 -42 -410 215 -782 614 -887 104 -27 294 -25 398 4 295 84 518 314 588 607 18 75 20 111 17 220 -4 114 -9 142 -37 226 -86 253 -267 435 -520 520 -85 28 -111 32 -226 35 -88 2 -150 -1 -193 -11z m214 -303 c17 -15 123 -106 235 -203 244 -211 246 -213 229 -234 -7 -8 -28 -15 -46 -15 l-34 0 -2 -252 -3 -253 -425 0 -425 0 -3 253 -2 252 -35 0 c-25 0 -37 6 -45 21 -7 11 -10 22 -8 24 134 122 507 435 518 435 8 -1 29 -13 46 -28z" />
        <path d="M1144 1569 c-71 -61 -143 -123 -161 -138 l-33 -26 0 -237 0 -238 330 0 330 0 -1 238 0 237 -159 135 c-88 74 -163 136 -168 138 -5 1 -67 -47 -138 -109z m116 -279 l0 -71 -62 3 -63 3 -3 54 c-5 78 -2 81 68 81 l60 0 0 -70z m168 -3 l3 -68 -63 3 -63 3 -3 68 -3 68 63 -3 63 -3 3 -68z m-168 -167 l0 -71 -62 3 -63 3 -3 54 c-5 78 -2 81 68 81 l60 0 0 -70z m165 0 l0 -65 -62 -3 -63 -3 0 71 0 71 63 -3 62 -3 0 -65z" />
      </g>
    </svg>
  )
  return (
    <div className={cn('text-4xl text-black font-bold dark:text-white', className)}>LogisGabon</div>
  )
}
