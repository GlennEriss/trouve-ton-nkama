/**
 * @module routes
 */

export const routes = {
    protected: {
        properties: '/property',
        add_property: '/property/add',
        add_home: '/property/add/home',
        add_apartment: '/property/add/apartment',
        add_building: '/property/add/building',
        add_desk: '/property/add/desk',
        add_studio: '/property/add/studio',
        add_villa: '/property/add/villa',
        add_room: '/property/add/room',
        add_kiosk: '/property/add/kiosk',
        add_shop: '/property/add/shop',
        add_land: '/property/add/land',
        account: '/profil',
        favoris: '/favoris',
        profil: '/profil',
        profil_informations: '/profil/informations',
        login_and_security: '/login-and-security',
        notifications: '/settings',
        notification_list: '/list-notifications',
        my_balance: '/my-balance',
        verify_phone: '/verify-phone',
    },
    public: {
        signinSignup: '/signin-signup',
        signin: '/signin',
        signup: '/signup',
        completeProfile: '/complete-profile',
        homePage: '/',
        reset_password: '/password-reset',
        passwordResetRequest: '/request-password-reset',
        passwordResetFailure: '/password-reset-failure',
        emailAlreadyVerified: '/email-already-verified',
        emailVerificationSuccess: '/email-verification-success',
        confidentiality: '/privacy-policy',
        terms_of_use: '/terms-of-use',
        data_deletion: '/data-deletion',
        search: '/search',
        search_property: '/search'
    },
    public_google: {
        homePage: '/',
        confidentiality: '/privacy-policy',
        terms_of_use: '/terms-of-use',
        search: '/search',
    }
}