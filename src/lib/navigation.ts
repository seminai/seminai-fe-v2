export type NavigationIconName = "home" | "dataset" | "calendar";

export class NavigationItem {
  readonly id: string;
  readonly label: string;
  readonly icon: NavigationIconName;
  readonly tabKey: string;

  constructor(options: {
    id: string;
    label: string;
    icon: NavigationIconName;
    tabKey: string;
  }) {
    this.id = options.id;
    this.label = options.label;
    this.icon = options.icon;
    this.tabKey = options.tabKey;
  }

  buildPath(basePath: string): string {
    const url = new URL(
      basePath,
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost"
    );
    url.searchParams.set("tab", this.tabKey);
    return url.pathname + url.search;
  }
}

export class NavigationModel {
  private readonly basePath: string;
  private readonly items: NavigationItem[];

  constructor(basePath: string, items?: NavigationItem[]) {
    this.basePath = basePath;
    this.items = items ?? [
      new NavigationItem({
        id: "home",
        label: "Home",
        icon: "home",
        tabKey: "home",
      }),
      new NavigationItem({
        id: "dataset",
        label: "Dati",
        icon: "dataset",
        tabKey: "data",
      }),
      new NavigationItem({
        id: "calendar",
        label: "Calendario",
        icon: "calendar",
        tabKey: "calendar",
      }),
    ];
  }

  getNavigationItems(): NavigationItem[] {
    return this.items;
  }

  getItemHref(item: NavigationItem): string {
    return item.buildPath(this.basePath);
  }

  isActive(pathname: string, search: string, item: NavigationItem): boolean {
    if (!pathname.startsWith(this.basePath)) return false;
    const params = new URLSearchParams(search);
    const tab = params.get("tab");
    return (tab ?? "home") === item.tabKey;
  }
}
