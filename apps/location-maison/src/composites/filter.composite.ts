/**
 * @module composites
 */

import { query, where } from "@/firebase/firestore";
import { StateCreation } from "@/models/creation";
import { WhereFilterOp } from "firebase-admin/firestore";

export interface FilterComponent {
    applyFilter(queryValue: any): any;
}

class CompositeFilter implements FilterComponent {
    constructor(protected filter?: FilterComponent) { }
    applyFilter(queryValue: any): any {
        queryValue = this.filter ? this.filter.applyFilter(queryValue) : queryValue;
        return queryValue;
    }
}

export class FilterWhere extends CompositeFilter {
    constructor(protected attributeName: string, protected attributeValue: any, protected operator: WhereFilterOp, filter?: FilterComponent) {
        super(filter);
    }
    applyFilter(queryValue: any) {
        queryValue =query(queryValue, where(this.attributeName, this.operator, this.attributeValue))
        if (this.filter)
            return this.filter.applyFilter(queryValue);
        return queryValue;
    }
}

export class StateFilter extends FilterWhere {
    constructor(private state: StateCreation) {
        super('state', state, '==');
    }
    applyFilter(queryValue: any) {
        return query(queryValue,where('state', '==', this.state))
    }

}