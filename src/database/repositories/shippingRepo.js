const supabase = require('../supabaseClient');

const getActiveShippingMethods = async () => {
    try {
        const { data, error } = await supabase
            .from('shipping_methods')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
            .order('cost', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.warn('[shippingRepo] getActiveShippingMethods Warnung/Fehler:', err.message);
        return [];
    }
};

const getAllShippingMethods = async (isAdmin = false) => {
    try {
        let query = supabase
            .from('shipping_methods')
            .select('*')
            .order('sort_order', { ascending: true })
            .order('cost', { ascending: true });

        if (!isAdmin) {
            query = query.eq('is_active', true);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.warn('[shippingRepo] getAllShippingMethods Warnung/Fehler:', err.message);
        return [];
    }
};

const getShippingMethodById = async (id) => {
    const { data, error } = await supabase
        .from('shipping_methods')
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (error) throw error;
    return data;
};

const addShippingMethod = async (nameOrObj, cost = 0.00, description = null, sortOrder = 0) => {
    let name = nameOrObj;
    let finalCost = cost;
    let finalDesc = description;
    let finalSort = sortOrder;

    if (typeof nameOrObj === 'object' && nameOrObj !== null) {
        name = nameOrObj.name;
        finalCost = nameOrObj.cost !== undefined ? nameOrObj.cost : 0.00;
        finalDesc = nameOrObj.description || null;
        finalSort = nameOrObj.sort_order || nameOrObj.sortOrder || 0;
    }

    const numCost = parseFloat(finalCost) || 0.00;
    const { data, error } = await supabase
        .from('shipping_methods')
        .insert([{
            name: (name || '').trim(),
            cost: numCost,
            description: finalDesc ? finalDesc.trim() : null,
            sort_order: finalSort || 0,
            is_active: true
        }])
        .select('*');

    if (error) throw error;
    return data ? data[0] : null;
};

const updateShippingMethod = async (id, fields) => {
    const { data, error } = await supabase
        .from('shipping_methods')
        .update(fields)
        .eq('id', id)
        .select('*');

    if (error) throw error;
    return data ? data[0] : null;
};

const toggleShippingMethodActive = async (id, isActive) => {
    return updateShippingMethod(id, { is_active: isActive });
};

const deleteShippingMethod = async (id) => {
    const { error } = await supabase
        .from('shipping_methods')
        .delete()
        .eq('id', id);

    if (error) throw error;
    return true;
};

module.exports = {
    getActiveShippingMethods,
    getAllShippingMethods,
    getShippingMethodById,
    addShippingMethod,
    updateShippingMethod,
    toggleShippingMethodActive,
    deleteShippingMethod
};
