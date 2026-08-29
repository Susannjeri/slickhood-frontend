import { useState, useEffect, useCallback, useMemo } from 'react';
import { useApi } from "@/hooks/useApi";

const PROPERTY_TYPE_KEY = "pms_property_types";
const UNIT_TYPE_KEY = "pms_unit_types";

export interface TypeMetaData {
    id: string;
    name: string;
    description: string;
}

export const usePropertyMetadata = () => {
    const { getSupportedPropertyTypes, fetchSupportedUnitTypes } = useApi();
    const [propertyTypes, setPropertyTypes] = useState<TypeMetaData[]>([]);
    const [unitTypes, setUnitTypes] = useState<Record<string, TypeMetaData[]>>({});
    const [loading, setLoading] = useState(false);
    const [currentPropertyType, setCurrentPropertyType] = useState<string | null>(null);


    useEffect(() => {
        const initProperties = async () => {
            const localData = localStorage.getItem(PROPERTY_TYPE_KEY);

            if (localData) {
                setPropertyTypes(JSON.parse(localData));
            } else {
                setLoading(true);
                const propertyTypeResponse = await getSupportedPropertyTypes();
                if (propertyTypeResponse.success && Array.isArray(propertyTypeResponse.data)) {
                    const fetchedTypes: any[] = propertyTypeResponse.data;

                    setPropertyTypes(fetchedTypes);
                    localStorage.setItem(PROPERTY_TYPE_KEY, JSON.stringify(fetchedTypes));
                }
                setLoading(false);
            }
        };
        const initUnitTypeFromLocalStorage = async () => {
            const localUnits = localStorage.getItem(UNIT_TYPE_KEY);
            const cache: Record<string, TypeMetaData[]> = localUnits ? JSON.parse(localUnits) : {};
            setUnitTypes(cache);
        }
        initProperties();
        initUnitTypeFromLocalStorage();
    }, []);

    const getUnitTypes = useCallback(async (propertyTypeName: string) => {
        setCurrentPropertyType(propertyTypeName);
        const localUnits = localStorage.getItem(UNIT_TYPE_KEY);
        const cache: Record<string, TypeMetaData[]> = localUnits ? JSON.parse(localUnits) : {};

        if (cache[propertyTypeName]) {
            return cache[propertyTypeName];
        }

        // Not in cache? Fetch from API
        setLoading(true);
        const unitTypeResponse = await fetchSupportedUnitTypes(propertyTypeName);

        if (unitTypeResponse.success && Array.isArray(unitTypeResponse.data)) {
            const fetchedTypes: TypeMetaData[] = unitTypeResponse.data;
            const updatedCache = { ...cache, [propertyTypeName]: fetchedTypes };
            setUnitTypes(updatedCache);
            localStorage.setItem(UNIT_TYPE_KEY, JSON.stringify(updatedCache));
            return updatedCache;
        }
        setLoading(false);
        return [];
    }, []);

    const propertyTypeOptions = useMemo(() =>
        propertyTypes.map(item => ({
            value: item.id,
            label: item.name,
            description: item.description
        })), [propertyTypes]);

    const unitTypeOptions = useMemo(() => {
        if (!currentPropertyType || !unitTypes[currentPropertyType]) {
            return [];
        }
        return unitTypes[currentPropertyType].map(unit => ({
            label: unit.name,
            value: unit.id
        }));
    }, [unitTypes, currentPropertyType]);

    const getPropertyTypeName = useCallback((id: string) => {
        const type = propertyTypes.find(t => String(t.id) === String(id));
        return type ? type.name : id;
    }, [propertyTypes]);

    const resolveUnitTypeLabel = useCallback((unitType: string) => {
        const foundUnit = unitTypeOptions.find(u => String(u.value) === String(unitType));
        return foundUnit ? foundUnit.label : unitType;
    }, [unitTypeOptions]);

    return {
        propertyTypeOptions,
        unitTypeOptions,
        getUnitTypes,
        getPropertyTypeName,
        setCurrentPropertyType,
        resolveUnitTypeLabel,
        isLoadingTypes: loading
    };
};