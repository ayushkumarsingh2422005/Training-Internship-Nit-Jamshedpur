type JsonLd = Record<string, unknown>;

type Props = {
  data: JsonLd | JsonLd[];
};

export function StructuredData({ data }: Props) {
  const items = Array.isArray(data) ? data : [data];

  return (
    <>
      {items.map((item, index) => (
        <script
          // eslint-disable-next-line react/no-danger
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </>
  );
}
