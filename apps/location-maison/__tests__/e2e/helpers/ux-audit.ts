import AxeBuilder from '@axe-core/playwright'
import { expect, type Locator, type Page } from '@playwright/test'

export function formatViolations(
  violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations'],
) {
  return violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    targets: violation.nodes.flatMap((node) => node.target.map(String)),
    elements: violation.nodes.map((node) => node.html),
  }))
}

export async function expectNoBlockingAccessibilityViolations(page: Page) {
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  const blockingViolations = accessibility.violations.filter(
    (violation) => violation.impact === 'critical' || violation.impact === 'serious',
  )

  expect(
    formatViolations(blockingViolations),
    `Violations WCAG bloquantes: ${JSON.stringify(formatViolations(blockingViolations), null, 2)}`,
  ).toEqual([])
}

export async function expectNoSmallTouchTargets(page: Page) {
  const failures = await page.evaluate(() => {
    const minimum = 44
    const candidates = Array.from(
      document.querySelectorAll<HTMLElement>(
        'main button:not([disabled]), main a[href], main input:not([type="hidden"]):not([type="file"]):not([disabled]), main textarea:not([disabled]), main select:not([disabled]):not([aria-hidden="true"]), main [role="button"], nav[aria-label="Navigation mobile"] a[href]',
      ),
    )

    return candidates.flatMap((element) => {
      const style = window.getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      const isVisible =
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        element.getAttribute('aria-hidden') !== 'true' &&
        Number(style.opacity) > 0 &&
        rect.width > 0 &&
        rect.height > 0

      if (!isVisible || (rect.width >= minimum && rect.height >= minimum)) return []

      return [{
        element: element.outerHTML.slice(0, 180),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      }]
    })
  })

  expect(failures, `Zones tactiles inférieures à 44px: ${JSON.stringify(failures, null, 2)}`).toEqual([])
}

export async function expectLastActionAboveBottomNavigation(page: Page) {
  const navigation = page.getByRole('navigation', { name: /Navigation mobile/i })
  if (await navigation.count() === 0 || !(await navigation.isVisible())) return

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await page.waitForTimeout(150)

  const overlap = await page.evaluate(() => {
    const nav = document.querySelector<HTMLElement>('nav[aria-label="Navigation mobile"]')
    const main = document.querySelector('main')
    if (!nav || !main) return null

    const navTop = nav.getBoundingClientRect().top
    const actions = Array.from(
      main.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([type="hidden"]), textarea, select'),
    ).filter((element) => {
      const rect = element.getBoundingClientRect()
      const style = window.getComputedStyle(element)
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden'
    })

    const lastAction = actions.sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom)[0]
    if (!lastAction) return null

    const rect = lastAction.getBoundingClientRect()
    return rect.bottom > navTop + 1
      ? { element: lastAction.outerHTML.slice(0, 180), actionBottom: Math.round(rect.bottom), navTop: Math.round(navTop) }
      : null
  })

  expect(overlap, `La dernière action est masquée par la navigation: ${JSON.stringify(overlap)}`).toBeNull()
}

export async function expectKeyboardReachable(
  page: Page,
  target: Locator,
  maximumTabs = 60,
) {
  await target.scrollIntoViewIfNeeded()
  await page.evaluate(() => {
    window.scrollTo(0, 0)
    const active = document.activeElement
    if (active instanceof HTMLElement) active.blur()
  })

  for (let index = 0; index < maximumTabs; index += 1) {
    await page.keyboard.press('Tab')
    const reached = await target.evaluate((element) => (
      element === document.activeElement || element.contains(document.activeElement)
    ))
    if (reached) {
      await expect(target).toBeFocused()
      return
    }
  }

  throw new Error(`La cible clavier n'a pas été atteinte après ${maximumTabs} tabulations`)
}
