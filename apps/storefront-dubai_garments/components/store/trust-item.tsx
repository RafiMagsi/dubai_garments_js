type TrustItemProps = {
  text: string;
};

export default function TrustItem({ text }: TrustItemProps) {
  return <p className="dg-trust-item">{text}</p>;
}
