/* eslint-disable @next/next/no-img-element */

export type SocialBrand = "instagram" | "linkedin" | "threads" | "x";

const SOCIAL_ICON_SRC: Record<SocialBrand, string> = {
  instagram: "/icons/social/icons8-instagram-48.png",
  linkedin: "/icons/social/icons8-linkedin-48.png",
  threads: "/icons/social/icons8-threads.svg",
  x: "/icons/social/icons8-x.svg",
};

type SocialBrandIconProps = {
  brand: SocialBrand;
  size?: number;
  color?: string;
  className?: string;
};

export function SocialBrandIcon({ brand, size = 20, className }: SocialBrandIconProps) {
  return (
    <img
      src={SOCIAL_ICON_SRC[brand]}
      alt=""
      width={size}
      height={size}
      draggable={false}
      className={className}
    />
  );
}

export const InstagramBrandIcon = (props: Omit<SocialBrandIconProps, "brand">) => (
  <SocialBrandIcon {...props} brand="instagram" />
);

export const LinkedInBrandIcon = (props: Omit<SocialBrandIconProps, "brand">) => (
  <SocialBrandIcon {...props} brand="linkedin" />
);

export const ThreadsBrandIcon = (props: Omit<SocialBrandIconProps, "brand">) => (
  <SocialBrandIcon {...props} brand="threads" />
);

export const XBrandIcon = (props: Omit<SocialBrandIconProps, "brand">) => (
  <SocialBrandIcon {...props} brand="x" />
);
