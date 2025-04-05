interface PropertyInfoProps {
  property: {
    bedroomCount: number;
    bathroomCount: number;
    viewCount: number;
    propertyDesc: string;
    propertyTags?: string[];
    houseRules?: string[];
    propertyName?: string;
    propertyLocation?: string;
    propertyPhotos?: string[];
    interestedCount?: number;
    ownerId?: string;
  };
  host: {
    username?: string;
  } | null;
}

const PropertyInfo = ({ property, host }: PropertyInfoProps) => {
  const Header = () => {
    return (
      <div className="py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{property.propertyName}</h1>
          {/* TODO: like backend (change 'fa-regular' to 'fa-fill'*/}
          <i className="fa-regular fa-heart text-3xl text-indigo-400"></i>
        </div>
        <p>{property.propertyLocation}</p>

        <div className="flex justify-between mt-4">
          <div className="flex items-center">
            {/* TODO: count stars */}
            {/*
              <i> tag classes:
              full star = fa-solid fa-star
              half star = fa-solid fa-star-half-stroke
              no star = fa-regular fa-star
            */}
            {[...Array(5)].map((_, index) => (
              <i key={index} className="fa-solid fa-star text-yellow-300"></i>
            ))}
            {/* TODO: count reviews */}
            <p className="text-sm ms-2">5 reviews</p>
          </div>

          <p className="text-xl font-semibold">
            ₱2,500<span className="text-xs font-light">/month</span>
          </p>
        </div>
      </div>
    )
  }

  const About = () => {
    return (
      <div className="py-8">
        <h2 className="text-xl font-semibold mb-2">About this place</h2>
        <p className="font-light">{property.propertyDesc}</p>
      </div>
    )
  }

  const Amenities = () => {
    return (
      <div className="py-8">
        <h2 className="text-xl font-semibold mb-2">What this place offers</h2>
        
        <div><i className="fa-solid fa-circle-check me-4 text-indigo-400 bg-clip-text"></i>{property.bedroomCount} bedroom</div>
        <div><i className="fa-solid fa-circle-check me-4 text-indigo-400 bg-clip-text"></i>{property.bathroomCount} bath</div>

        {property.propertyTags?.map((tag, index) => (
          <div key={`tag-${index}`}>
            <i className="fa-solid fa-circle-check me-4 text-indigo-400 bg-clip-text"></i>
            {tag}
          </div>
        ))}
      </div>
    )
  }

  const Rules = () => {
    return (
      <div className="py-8">
        <h2 className="text-xl font-semibold mb-2">House Rules</h2>
        {property.houseRules?.map((rule, index) => (
          <div key={`rule-${index}`}>
            <i className="fa-solid fa-triangle-exclamation me-4 text-red-500"></i>
            {rule}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="px-4">
      <Header />
      <hr className="text-gray-200" />
      <About />
      <hr className="text-gray-200" />
      <Amenities />
      <hr className="text-gray-200" />
      <Rules />
      <hr className="text-gray-200" />
    </div>
  );
};

export default PropertyInfo;
