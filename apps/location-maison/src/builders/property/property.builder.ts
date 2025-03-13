/**
 * @module Builders/property
 */

import { Image, Property } from "@/models/annonce";

/**
 * Abstract builder class for constructing `Property` objects.
 * 
 * This class provides a set of methods to configure various attributes of a property, such as 
 * images, title, description, price, and location details. Each method returns the current 
 * instance of the builder to allow method chaining. The `build` method finalizes the 
 * construction and returns the built `Property` object.
 * 
 * @abstract
 * @class PropertyBuilder
 */
export abstract class PropertyBuilder {
    /**
     * @protected
     * @type {Property}
     * 
     * An internal property object that stores the values set by the builder methods.
     */
    protected property: Property;

    /**
     * Initializes a new `PropertyBuilder` instance with default values for a `Property`.
     * The default `state` is set to 'InProgress', and the default country is set to 'Gabon'.
     * 
     * @protected
     */
    protected constructor() {
        this.property = {
            typeProperty: 'Property',
            images: [],
            title: '',
            description: '',
            price: 0,
            area: 0,
            tags: [],
            street: '',
            city: '',
            province: '',
            additionnalInformation: '',
            longitude: 0,
            latitude: 0,
            countryCode: 'ga',
            country: 'Gabon',
            /* createdAt: new Date(),
            updatedAt: new Date(), */
            state: 'IN_PROGRESS',
            status: "FOR_RENT"
        };
    }

    /**
     * Sets the images for the property.
     * 
     * @param {Image[]} images - Array of images related to the property.
     * @returns {PropertyBuilder} The current instance of `PropertyBuilder`.
     */
    setImages(images: Image[]) {
        this.property.images = images;
        return this;
    }

    /**
     * Sets the title of the property.
     * 
     * @param {string} title - The title of the property.
     * @returns {PropertyBuilder} The current instance of `PropertyBuilder`.
     */
    setTitle(title: string) {
        this.property.title = title;
        return this;
    }

    /**
     * Sets the description of the property.
     * 
     * @param {string} description - A detailed description of the property.
     * @returns {PropertyBuilder} The current instance of `PropertyBuilder`.
     */
    setDescription(description: string) {
        this.property.description = description;
        return this;
    }

    /**
     * Sets the price of the property.
     * 
     * @param {number} price - The price or rent of the property.
     * @returns {PropertyBuilder} The current instance of `PropertyBuilder`.
     */
    setPrice(price: number) {
        this.property.price = price;
        return this;
    }

    /**
     * Sets the area of the property in square meters.
     * 
     * @param {number} area - The area of the property.
     * @returns {PropertyBuilder} The current instance of `PropertyBuilder`.
     */
    setArea(area: number) {
        this.property.area = area;
        return this;
    }

    /**
     * Sets the tags associated with the property.
     * 
     * @param {string[]} tags - An array of descriptive tags for the property.
     * @returns {PropertyBuilder} The current instance of `PropertyBuilder`.
     */
    setTags(tags: string[]) {
        this.property.tags = tags;
        return this;
    }

    /**
     * Sets the street address of the property.
     * 
     * @param {string} street - The street where the property is located.
     * @returns {PropertyBuilder} The current instance of `PropertyBuilder`.
     */
    setStreet(street: string) {
        this.property.street = street;
        return this;
    }

    /**
     * Sets the city where the property is located.
     * 
     * @param {string} city - The city where the property is located.
     * @returns {PropertyBuilder} The current instance of `PropertyBuilder`.
     */
    setCity(city: string) {
        this.property.city = city;
        return this;
    }

    /**
     * Sets the province or state of the property.
     * 
     * @param {string} province - The province where the property is located.
     * @returns {PropertyBuilder} The current instance of `PropertyBuilder`.
     */
    setProvince(province: string) {
        this.property.province = province;
        return this;
    }

    /**
     * Sets any additional information about the property.
     * 
     * @param {string} additionnalInformation - Optional additional information about the property.
     * @returns {PropertyBuilder} The current instance of `PropertyBuilder`.
     */
    setAdditionnalInformation(additionnalInformation: string) {
        this.property.additionnalInformation = additionnalInformation;
        return this;
    }

    /**
     * Sets the country code for the property.
     * 
     * @param {string} countryCode - The country code (ISO format) for the property's location.
     * @returns {PropertyBuilder} The current instance of `PropertyBuilder`.
     */
    setCountryCode(countryCode: string) {
        this.property.countryCode = countryCode;
        return this;
    }

    /**
     * Sets the country of the property.
     * 
     * @param {string} country - The country where the property is located.
     * @returns {PropertyBuilder} The current instance of `PropertyBuilder`.
     */
    setCountry(country: string) {
        this.property.country = country;
        return this;
    }

    /**
     * Sets the latitude coordinate of the property.
     * 
     * @param {number} latitude - The latitude of the property.
     * @returns {PropertyBuilder} The current instance of `PropertyBuilder`.
     */
    setLatitude(latitude: number) {
        this.property.latitude = latitude;
        return this;
    }

    /**
     * Sets the longitude coordinate of the property.
     * 
     * @param {number} longitude - The longitude of the property.
     * @returns {PropertyBuilder} The current instance of `PropertyBuilder`.
     */
    setLongitude(longitude: number) {
        this.property.longitude = longitude;
        return this;
    }

    /**
     * Finalizes the construction of the `Property` object and returns it.
     * 
     * @returns {Property} The built `Property` object.
     */
    build(): Property {
        return this.property;
    }
}