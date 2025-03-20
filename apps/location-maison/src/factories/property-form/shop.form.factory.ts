/**
 * @module factories/property-form
 */
import { ShopFormBuilder } from "@/builders/property-form/shop.form.builder";
import { PropertyFormBuilderFactory } from "./property.form.factory";

/**
 * The `ShopFormFactory` class is responsible for creating an instance of the `ShopFormBuilder`.
 * It implements the `PropertyFormBuilderFactory` interface, following the Factory Pattern.
 * 
 * This factory generates a shop-specific form builder that contains form elements for properties related to shops.
 * 
 * @class ShopFormFactory
 * @implements {PropertyFormBuilderFactory}
 */
export class ShopFormFactory implements PropertyFormBuilderFactory {

    /**
     * Creates and returns an instance of the `ShopFormBuilder`.
     * 
     * @returns {ShopFormBuilder} An instance of the `ShopFormBuilder` used to build forms specific to shop properties.
     * 
     * @example
     * const shopFactory = new ShopFormFactory();
     * const builder = shopFactory.createFormBuilder();
     * const formElements = builder.build();
     */
    createFormBuilder(): ShopFormBuilder {
        return ShopFormBuilder.getInstance();
    }
}
