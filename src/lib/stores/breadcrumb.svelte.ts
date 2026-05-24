type BreadcrumbItem = {
    label: string;
    href?: string;
};

let items = $state<BreadcrumbItem[]>([]);

export const breadcrumb = {
    get items() {
        return items;
    },
    set(newItems: BreadcrumbItem[]) {
        items = newItems;
    },
    reset() {
        items = [];
    }
};
