import { useState, useEffect } from "react";
import "./FilterMenu.css";

interface FilterMenuProps {
  onFilterChange: (filters: {
    priceRange: { min: number; max: number };
    selectedTags: string[];
    selectedLocation: string;
    selectedPropertyType: string;
    sortBy: string;
  }) => void;
  isLoading: boolean;
  availableTags: string[];
  availableLocations: string[];
  properties: {
    propertyTags: string[];
    propertyPrice: number;
    propertyLocation: string;
    propertyType: string;
  }[];
}

export function FilterMenu({
  onFilterChange,
  availableTags,
  availableLocations,
  properties,
}: FilterMenuProps) {
  const MAX_PRICE = 1000000; // Define a maximum price constant
  const [priceRange, setPriceRange] = useState({ min: 0, max: MAX_PRICE });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>("");
  const [sortBy, setSortBy] = useState("newest");
  const [showAllTags, setShowAllTags] = useState(false);
  
  // Extract unique property types from properties
  const propertyTypes = [...new Set(properties.map(p => p.propertyType).filter(Boolean))];


  const visibleTags = showAllTags ? availableTags : availableTags.slice(0, 4);

  useEffect(() => {
    onFilterChange({
      priceRange,
      selectedTags,
      selectedLocation,
      selectedPropertyType,
      sortBy,
    });
  }, [
    priceRange,
    selectedTags,
    selectedLocation,
    selectedPropertyType,
    sortBy,
  ]);

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const getTagCount = (tag: string): number => {
    // Start with all properties that have this tag
    let matchingProperties = properties.filter(
      (property) => property.propertyTags && property.propertyTags.includes(tag)
    );

    // If there are any active filters (except tags), apply them
    if (
      priceRange.min > 0 ||
      priceRange.max < MAX_PRICE ||
      selectedLocation ||
      selectedPropertyType
    ) {
      matchingProperties = matchingProperties.filter((property) => {
        const matchesPrice =
          property.propertyPrice >= (priceRange.min || 0) &&
          property.propertyPrice <= (priceRange.max || MAX_PRICE);

        const matchesLocation =
          !selectedLocation || property.propertyLocation === selectedLocation;

        const matchesType =
          !selectedPropertyType ||
          property.propertyType === selectedPropertyType;

        return matchesPrice && matchesLocation && matchesType;
      });
    }

    return matchingProperties.length;
  };

  const PriceRange = () => {
    // Use local state for input values to prevent losing focus
    const [minInput, setMinInput] = useState(priceRange.min === 0 ? '' : priceRange.min.toString());
    const [maxInput, setMaxInput] = useState(priceRange.max === MAX_PRICE ? '' : priceRange.max.toString());

    // Handle blur events to update the actual filter
    const handleMinBlur = () => {
      const newMin = minInput === '' ? 0 : parseInt(minInput);
      setPriceRange(prev => ({ ...prev, min: newMin }));
    };

    const handleMaxBlur = () => {
      const newMax = maxInput === '' ? MAX_PRICE : parseInt(maxInput);
      setPriceRange(prev => ({ ...prev, max: newMax }));
    };

    // Update local inputs when filter is reset
    useEffect(() => {
      if (priceRange.min === 0) setMinInput('');
      if (priceRange.max === MAX_PRICE) setMaxInput('');
    }, [priceRange]);

    return (
      <div className="mb-4">
        <label className="block text-sm font-medium">Price Range</label>
        <div className="flex gap-2 mt-1">
          <input
            type="number"
            placeholder="Min"
            value={minInput}
            onChange={(e) => setMinInput(e.target.value)}
            onBlur={handleMinBlur}
            className="w-full p-2 border rounded-lg"
          />
          <input
            type="number"
            placeholder="Max"
            value={maxInput}
            onChange={(e) => setMaxInput(e.target.value)}
            onBlur={handleMaxBlur}
            className="w-full p-2 border rounded-lg"
          />
        </div>
      </div>
    );
  };

  const LocationDropdown = () => {
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium">Location</label>
        <select 
          className="w-full p-2 mt-1 border rounded-lg"
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
        >
          <option value="">All Locations</option>
          {availableLocations.map((location) => (
            <option key={location} value={location}>
              {location}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const PropertyType = () => {
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Type</label>
        <div className="flex flex-col gap-2 mt-1">
          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
            <input
              type="radio"
              name="propertyType"
              value=""
              checked={selectedPropertyType === ""}
              onChange={() => setSelectedPropertyType("")}
              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            All Properties
          </label>
          {propertyTypes.map((type) => (
            <label key={type} className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input
                type="radio"
                name="propertyType"
                value={type}
                checked={selectedPropertyType === type}
                onChange={() => setSelectedPropertyType(type)}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </label>
          ))}
        </div>
      </div>
    );
  };

  const Tags = () => {
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tags
        </label>

        <div className="flex flex-col gap-2">
          {visibleTags.map((tag) => (
            <label
              key={tag}
              className="flex items-center gap-2 text-sm font-medium cursor-pointer"
            >
              <input
                type="checkbox"
                name={tag}
                checked={selectedTags.includes(tag)}
                onChange={() => handleTagToggle(tag)}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              {tag}
              <span className="ml-auto text-xs text-gray-500">
                {getTagCount(tag)}
              </span>
            </label>
          ))}
        </div>

        {availableTags.length > 6 && (
          <button
            className="mt-2 text-sm hover:underline flex items-center gap-1"
            onClick={() => setShowAllTags(!showAllTags)}
          >
            More {showAllTags ? "▲" : "▼"}
          </button>
        )}
      </div>
    );
  };

  const ResetButton = () => {
    return (
      <button 
        className="w-full border rounded py-3 hover:bg-gray-100 transition-colors"
        onClick={() => {
          setPriceRange({ min: 0, max: MAX_PRICE });
          setSelectedTags([]);
          setSelectedLocation('');
          setSelectedPropertyType('');
          setSortBy('newest');
        }}
      >
        Reset Filters
      </button>
    );
  };

  return (
    <div>
      <div className="bg-white px-4 py-8 xl:p-4 rounded-lg">
        <h2 className="text-gray-700 font-semibold mb-4">
          <i className="fa-solid fa-filter text-2xl me-2"></i>Filters
        </h2>

        <PriceRange />
        <LocationDropdown />
        <PropertyType />
        <Tags />
        <ResetButton />
      </div>
    </div>
  );
}

{
  /* <div className="filter-menu">
  <h2>Filters</h2>

  --------------- Add Sort Section
  <div className="sort-section">
    <h3>Sort</h3>
    <select
      className="sort-select"
      value={sortBy}
      onChange={(e) => setSortBy(e.target.value)}
    >
      <option value="most-popular">Most Popular</option>
      <option value="newest">Newest</option>
      <option value="oldest">Oldest</option>
      <option value="price-low">Price: Low to High</option>
      <option value="price-high">Price: High to Low</option>
      <option value="top-rated">Top Rated</option>
    </select>
  </div>

  -------------------- Price Range
  <div className="filter-section">
    <h3>Price Range</h3>
    <div className="price-range">
      <input
        type="number"
        value={priceRange.min}
        onChange={e => {
          const value = e.target.value;
          setPriceRange(prev => ({
            ...prev,
            min: value === '' ? 0 : parseInt(value)
          }));
        }}
        placeholder="Min"
      />
      <span>to</span>
      <input
        type="number"
        value={priceRange.max}
        onChange={e => {
          const value = e.target.value;
          setPriceRange(prev => ({
            ...prev,
            max: value === '' ? MAX_PRICE : parseInt(value)
          }));
        }}
        placeholder="Max"
      />
    </div>
  </div>

  -------------------------- Tags
  <div className="filter-section">
    <h3>Tags</h3>
    <div className="tags-grid">
      {visibleTags.map(tag => (
        <label key={tag} className="tag-checkbox">
          <input
            type="checkbox"
            name={tag}
            checked={selectedTags.includes(tag)}
            onChange={() => handleTagToggle(tag)}
          />
          <span className="checkmark"></span>
          {tag}
          <span className="count">{getTagCount(tag)}</span>
        </label>
      ))}
      {availableTags.length > 6 && (
        <div
          className="more-tags-button"
          onClick={() => setShowAllTags(!showAllTags)}
        >
          More {showAllTags ? '▲' : '▼'}
        </div>
      )}
    </div>
  </div>

  ------------------------------- Location
  <div className="filter-section">
    <h3>Location</h3>
    <select
      className="location-select"
      value={selectedLocation}
      onChange={e => setSelectedLocation(e.target.value)}
    >
      <option value="">All Locations</option>
      {availableLocations.map(location => (
        <option key={location} value={location}>
          {location}
        </option>
      ))}
    </select>
  </div>

  -------------------------------- Property Type
  <div className="filter-section">
    <h3>Property Type</h3>
    <select
      className="type-select"
      value={selectedPropertyType}
      onChange={e => setSelectedPropertyType(e.target.value)}
    >
      <option value="">All Types</option>
      {propertyTypes.map(type => (
        <option key={type} value={type}>
          {type}
        </option>
      ))}
    </select>
  </div>

  ---------------------------------- Reset Button
  <div className="filter-buttons">
    <button
      className="reset-button"
      onClick={() => {
        setPriceRange({ min: 0, max: MAX_PRICE });
        setSelectedTags([]);
        setSelectedLocation('');
        setSelectedPropertyType('');
        setSortBy('most-popular');
      }}
    >
      Reset Filters
    </button>
  </div>
</div> */
}
