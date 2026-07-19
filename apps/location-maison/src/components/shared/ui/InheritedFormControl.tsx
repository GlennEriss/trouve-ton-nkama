'use client'

import React from 'react'

type InheritedFormControlProps = React.AriaAttributes & {
    id?: string
    children: React.ReactNode
}

const InheritedFormControlContext = React.createContext<Omit<InheritedFormControlProps, 'children'>>({})

export const InheritedFormControl = React.forwardRef<HTMLElement, InheritedFormControlProps>(
    ({ children, ...controlProps }, _ref) => (
        <InheritedFormControlContext.Provider value={controlProps}>
            {children}
        </InheritedFormControlContext.Provider>
    ),
)

InheritedFormControl.displayName = 'InheritedFormControl'

export function useInheritedFormControl() {
    return React.useContext(InheritedFormControlContext)
}
