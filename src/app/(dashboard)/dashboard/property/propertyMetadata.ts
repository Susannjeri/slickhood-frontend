import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useApi } from "@/hooks/useApi";

const PROPERTY_TYPE_KEY = "pms_property_types";
const UNIT_TYPE_KEY = "pms_unit_types";

function readCache<T>(key: string, fallback: T): T {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) as T : fallback;
    } catch {
        localStorage.removeItem(key);
        return fallback;
    }
}

export interface TypeMetaData {
    id: string;
    name: string;
    description: string;
    category?: string;
    displayOrder?: number;
    common?: boolean;
}

export const usePropertyMetadata = () => {
    const { getSupportedPropertyTypes, fetchSupportedUnitTypes } = useApi();
    const getSupportedPropertyTypesRef = useRef(getSupportedPropertyTypes);
    const fetchSupportedUnitTypesRef = useRef(fetchSupportedUnitTypes);
    const [propertyTypes, setPropertyTypes] = useState<TypeMetaData[]>([]);
    const [unitTypes, setUnitTypes] = useState<Record<string, TypeMetaData[]>>({});
    const [loading, setLoading] = useState(false);
    const [currentPropertyType, setCurrentPropertyType] = useState<string | null>(null);


    useEffect(() => {
        const initProperties = async () => {
            const cachedTypes = readCache<TypeMetaData[]>(PROPERTY_TYPE_KEY, []);

            if (cachedTypes.length > 0) setPropertyTypes(cachedTypes);
            setLoading(true);
            try {
                const propertyTypeResponse = await getSupportedPropertyTypesRef.current();
                if (propertyTypeResponse.success && Array.isArray(propertyTypeResponse.data)) {
                    const fetchedTypes: TypeMetaData[] = propertyTypeResponse.data;
                    setPropertyTypes(fetchedTypes);
                    localStorage.setItem(PROPERTY_TYPE_KEY, JSON.stringify(fetchedTypes));
                }
            } catch {
                if (cachedTypes.length === 0) setPropertyTypes([]);
            } finally {
                setLoading(false);
            }
        };
        const initUnitTypeFromLocalStorage = async () => {
            const cache = readCache<Record<string, TypeMetaData[]>>(UNIT_TYPE_KEY, {});
            setUnitTypes(cache);
        }
        initProperties();
        initUnitTypeFromLocalStorage();
    }, []);

    const getUnitTypes = useCallback(async (propertyTypeName: string) => {
        setCurrentPropertyType(propertyTypeName);
        const cache = readCache<Record<string, TypeMetaData[]>>(UNIT_TYPE_KEY, {});

        // Refresh on use so a super-admin catalogue update is visible immediately.
        // The last successful response remains as an offline/transient-error fallback.
        setLoading(true);
        try {
            const unitTypeResponse = await fetchSupportedUnitTypesRef.current(propertyTypeName);
            if (unitTypeResponse.success && Array.isArray(unitTypeResponse.data)) {
                const fetchedTypes: TypeMetaData[] = unitTypeResponse.data;
                const updatedCache = { ...cache, [propertyTypeName]: fetchedTypes };
                setUnitTypes(updatedCache);
                localStorage.setItem(UNIT_TYPE_KEY, JSON.stringify(updatedCache));
                return fetchedTypes;
            }
            return cache[propertyTypeName] ?? [];
        } catch {
            return cache[propertyTypeName] ?? [];
        } finally {
            setLoading(false);
        }
    }, []);

    const propertyTypeOptions = useMemo(() =>
        propertyTypes.map(item => ({
            value: item.id,
            label: item.name,
            description: item.description,
            category: item.category,
            common: item.common,
            displayOrder: item.displayOrder
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
