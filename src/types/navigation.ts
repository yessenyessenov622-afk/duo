export type NavigationItem = {
  href: string;
  label: string;
  icon: string;
};

export type MascotPreview = {
  id: string;
  species: "cat" | "fox" | "raccoon" | "owl" | "penguin";
  name: string;
  kind: string;
  color: string;
  description: string;
  personality: string;
  greeting: string[];
};
