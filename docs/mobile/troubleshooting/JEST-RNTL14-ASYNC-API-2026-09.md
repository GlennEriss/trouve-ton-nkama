# @testing-library/react-native 14.x : API entièrement async (React 19)

## Symptôme

`renderHook()`/`render()` suivi d'une assertion sur `result.current` échoue avec
`Cannot read properties of undefined (reading 'current')`, ou pire : le process Jest ne se
termine jamais après la fin apparente des tests ("Jest did not exit one second after the test
run has completed"), ce qui ressemble à un deadlock total si on attend la fin du *process*
plutôt que la fin des *tests* (le buffer de sortie reste vide jusqu'au bout).

## Cause

Dans `@testing-library/react-native@14.x` (la version compatible React 19, seule version
publiée au moment où ceci a été écrit), les fonctions suivantes sont **toutes async** — un
changement silencieux par rapport aux versions précédentes (12.x/13.x, React 18) où elles
étaient synchrones :

- `render(...)`
- `renderHook(...)`
- `fireEvent.press(...)`, `fireEvent.changeText(...)`, etc.

Sans `await`, la déstructuration (`const { result } = renderHook(...)`) récupère un objet vide
silencieusement — aucune erreur immédiate, juste un `undefined` plus tard.

## Fix

- Toujours `await render(...)`, `await renderHook(...)`, `await fireEvent.xxx(...)`.
- Ne **jamais** envelopper un `fireEvent.xxx(...)` déjà async dans son propre `act()` manuel —
  ça déclenche "You seem to have overlapping act() calls" et casse le rendu suivant.
- Pour déclencher un callback capturé manuellement (ex: un callback `onSnapshot` mocké), utiliser
  `await act(async () => { callback(...) })`.
- Appeler `unmount()` en fin de test (pour un hook avec un `useEffect` qui pose un `setInterval`
  ou un abonnement Firestore) — sinon Jest n'arrive jamais à quitter le process et le test
  runner reste bloqué en apparence, même si le test lui-même a réussi en quelques millisecondes.
  `--forceExit` marche aussi en dépannage, mais `unmount()` est la vraie correction.

Voir `src/hooks/__tests__/useNotifications.test.ts` et
`src/screens/auth/__tests__/PhoneSignInScreen.test.tsx` pour des exemples fonctionnels.
