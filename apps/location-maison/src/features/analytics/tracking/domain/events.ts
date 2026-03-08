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
  CTA_HOME_PUBLISH_CLICK: 'cta_home_publish_click',
  CTA_HOME_SEARCH_CLICK: 'cta_home_search_click',
  CTA_HOME_EXPLORE_CLICK: 'cta_home_explore_click',
  CTA_SEARCH_SUBMIT_CLICK: 'cta_search_submit_click',
  CTA_PROPERTY_CARD_CLICK: 'cta_property_card_click',
  CTA_PROPERTY_WHATSAPP_CONTACT_CLICK: 'cta_property_whatsapp_contact_click',
  CTA_PROPERTY_FAVORITE_ADD_CLICK: 'cta_property_favorite_add_click',
  CTA_PROPERTY_FAVORITE_REMOVE_CLICK: 'cta_property_favorite_remove_click',
  CTA_BALANCE_RECHARGE_WHATSAPP_CLICK: 'cta_balance_recharge_whatsapp_click',
  BUSINESS_AUTH_SIGNIN_SUCCESS: 'business_auth_signin_success',
  BUSINESS_AUTH_SIGNUP_SUCCESS: 'business_auth_signup_success',
} as const;

export type TrackingEventName = (typeof trackingEvents)[keyof typeof trackingEvents];

export type TrackingRoleContext = 'visitor' | 'user' | 'announcer';
