type TrustItemProps = {
  text: string;
};

export default function TrustItem({ text }: TrustItemProps) {
  return <p className="dg-trust-item dgx-trust-item">{text}</p>;
}
