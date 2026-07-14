import crypto from 'crypto'
import {
  buildCallbackPayload,
  computeCallbackHash,
  isSuccessCallback,
  timingSafeEqual,
  type CallbackPayload,
} from '../../src/payments/mypayga/callback-shared'
import {
  GIFT_COMMISSION_RATE,
  GIFT_MAX_AMOUNT_XAF,
  GIFT_MIN_AMOUNT_XAF,
  computeNetAmount,
} from '../../src/payments/gifts/constants'

describe('computeNetAmount', () => {
  it('applique la commission de 15 % avec arrondi au FCFA inférieur', () => {
    expect(GIFT_COMMISSION_RATE).toBe(0.15)
    expect(computeNetAmount(1000)).toBe(850)
    expect(computeNetAmount(500)).toBe(425)
    expect(computeNetAmount(2000)).toBe(1700)
  })

  it('arrondit toujours en faveur de la plateforme (floor)', () => {
    // 999 * 0.85 = 849.15 → 849
    expect(computeNetAmount(999)).toBe(849)
    // 501 * 0.85 = 425.85 → 425
    expect(computeNetAmount(501)).toBe(425)
  })

  it('reste cohérent aux bornes du montant autorisé', () => {
    expect(computeNetAmount(GIFT_MIN_AMOUNT_XAF)).toBeGreaterThan(0)
    expect(computeNetAmount(GIFT_MAX_AMOUNT_XAF)).toBe(85_000)
  })
})

describe('computeCallbackHash (helpers partagés MyPayGa)', () => {
  const secret = 'test-secret'
  const payload: CallbackPayload = {
    uniqueId: 'TXN_123_ABC',
    hash: '',
    amount: '1000',
    orderStatus: '200',
    statusRequest: '200',
    paymentToken: 'tok_1',
    paymentMethod: 'AM',
    message: 'Success',
    clientPhone: '074123456',
    currency: 'XAF',
  }

  it('calcule le HMAC-SHA512 sur les champs ordonnés', () => {
    const expected = crypto
      .createHmac('sha512', secret)
      .update(['200', 'TXN_123_ABC', '1000', 'tok_1', 'AM', 'Success', '074123456'].join(''))
      .digest('hex')
    expect(computeCallbackHash(payload, secret)).toBe(expected)
  })

  it('produit un hash différent si le montant change (anti-falsification)', () => {
    const tampered = { ...payload, amount: '9999' }
    expect(computeCallbackHash(tampered, secret)).not.toBe(computeCallbackHash(payload, secret))
  })
})

describe('timingSafeEqual', () => {
  it('accepte des hashs identiques indépendamment de la casse', () => {
    expect(timingSafeEqual('ABCDEF', 'abcdef')).toBe(true)
  })

  it('refuse des hashs différents ou vides', () => {
    expect(timingSafeEqual('abc', 'abd')).toBe(false)
    expect(timingSafeEqual('', 'abc')).toBe(false)
    expect(timingSafeEqual('abc', '')).toBe(false)
    expect(timingSafeEqual('abc', 'abcd')).toBe(false)
  })
})

describe('isSuccessCallback', () => {
  const base: CallbackPayload = {
    uniqueId: 'x', hash: '', amount: '', orderStatus: '', statusRequest: '',
    paymentToken: '', paymentMethod: '', message: '', clientPhone: '', currency: '',
  }

  it('reconnaît les statuts de succès', () => {
    expect(isSuccessCallback({ ...base, orderStatus: '200' })).toBe(true)
    expect(isSuccessCallback({ ...base, orderStatus: 'SUCCESS' })).toBe(true)
    expect(isSuccessCallback({ ...base, statusRequest: '200' })).toBe(true)
    expect(isSuccessCallback({ ...base, message: 'Paiement en succès' })).toBe(true)
  })

  it('refuse les statuts d’échec', () => {
    expect(isSuccessCallback({ ...base, orderStatus: '400', message: 'refused' })).toBe(false)
    expect(isSuccessCallback(base)).toBe(false)
  })
})

describe('buildCallbackPayload', () => {
  it('extrait les champs depuis un corps JSON déjà parsé', () => {
    const req = {
      body: {
        unique_id: 'TXN_1',
        hash: 'h',
        amount: '500',
        order_status: '200',
        payment_token: 't',
        payment_method: 'AM',
        message: 'ok',
        client_phone: '074000000',
        currency: 'XAF',
      },
    }
    const payload = buildCallbackPayload(req)
    expect(payload.uniqueId).toBe('TXN_1')
    expect(payload.amount).toBe('500')
    expect(payload.clientPhone).toBe('074000000')
  })

  it('extrait les champs depuis un corps form-urlencoded brut', () => {
    const raw = 'unique_id=TXN_2&hash=h2&amount=1000&order_status=200'
    const payload = buildCallbackPayload({ body: raw })
    expect(payload.uniqueId).toBe('TXN_2')
    expect(payload.hash).toBe('h2')
    expect(payload.amount).toBe('1000')
  })

  it('privilégie le corps sur la query en cas de doublon', () => {
    const payload = buildCallbackPayload({
      body: { unique_id: 'FROM_BODY' },
      query: { unique_id: 'FROM_QUERY' },
    })
    expect(payload.uniqueId).toBe('FROM_BODY')
  })
})
