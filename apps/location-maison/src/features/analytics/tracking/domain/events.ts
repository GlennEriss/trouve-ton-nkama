export const trackingEvents = {
  PAGE_VIEW: 'page_view',
  PAGE_HOME_VIEW: 'page_home_view',
  PAGE_SEARCH_VIEW: 'page_search_view',
  PAGE_PROPERTY_DETAILS_VIEW: 'page_property_details_view',
  PAGE_SIGNIN_VIEW: 'page_signin_view',
  PAGE_SIGNUP_VIEW: 'page_signup_view',
  CTA_AUTH_SIGNIN_CLICK: 'cta_auth_signin_click',
  CTA_AUTH_SIGNUP_CLICK: 'cta_auth_signup_click',
  CTA_AUTH_GOOGLE_CLICK: 'cta_auth_google_click',
  BUSINESS_AUTH_SIGNIN_SUCCESS: 'business_auth_signin_success',
  BUSINESS_AUTH_SIGNUP_SUCCESS: 'business_auth_signup_success',
} as const;

export type TrackingEventName = (typeof trackingEvents)[keyof typeof trackingEvents];

export type TrackingRoleContext = 'visitor' | 'user' | 'announcer';
