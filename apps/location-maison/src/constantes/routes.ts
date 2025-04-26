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
        account: '/profil',
        favoris: '/favoris',
        profil: '/profil',
        profil_informations: '/profil/informations',
        login_and_security: '/login-and-security',
        notifications: '/notifications',
        notification_list: '/list-notifications',
    },
    public: {
        signinSignup: '/signin-signup',
        signin: '/signin',
        signup: '/signup',
        homePage: '/',
        reset_password: '/password-reset',
        confidentiality: '/privacy-policy',
        terms_of_use: '/terms-of-use',
        data_deletion: '/data-deletion',
        search_property: '/search'
    }
}