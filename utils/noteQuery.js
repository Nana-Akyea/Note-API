const SORT_FIELDS = ['createdAt', 'updatedAt', 'title', 'category'];

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parsePositiveInteger = (value, name, defaultValue) => {
    if (value === undefined) {
        return defaultValue;
    }

    const normalized = String(value).trim();
    const parsed = Number(normalized);
    if (!/^\d+$/.test(normalized) || !Number.isSafeInteger(parsed) || parsed < 1) {
        const error = new Error(`Query parameter "${name}" must be a positive integer.`);
        error.status = 400;
        throw error;
    }

    return parsed;
};

const buildNoteListQuery = (query, ownerId) => {
    const page = parsePositiveInteger(query.page, 'page', 1);
    const requestedLimit = parsePositiveInteger(query.limit, 'limit', 10);
    const limit = Math.min(100, requestedLimit);
    const skip = (page - 1) * limit;
    if (!Number.isSafeInteger(skip)) {
        const error = new Error('The requested page is too large.');
        error.status = 400;
        throw error;
    }

    const sort = String(query.sort || '-createdAt');
    const sortField = sort.replace(/^-/, '');
    if (!SORT_FIELDS.includes(sortField)) {
        const error = new Error(
            `Invalid sort field "${sortField}". Use one of: ${SORT_FIELDS.join(', ')} (prefix with - for descending)`
        );
        error.status = 400;
        throw error;
    }

    const filter = { owner: ownerId };
    const search = String(query.search || query.q || '').trim();
    if (search) {
        filter.$text = { $search: search };
    }
    if (query.category) {
        filter.category = new RegExp(`^${escapeRegex(String(query.category))}$`, 'i');
    }
    if (query.tag) {
        filter.tags = String(query.tag).toLowerCase();
    }

    return {
        page,
        limit,
        filter,
        sort: { [sortField]: sort.startsWith('-') ? -1 : 1, _id: 1 },
        skip
    };
};

module.exports = buildNoteListQuery;
