import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import he from 'he';

function Watchlist() {
    const [stocks, setStocks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentDate, setCurrentDate] = useState('');

    const navigate = useNavigate();

    useEffect(() => {
        // Set current date
        const today = new Date();
        const formattedDate = today.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        setCurrentDate(formattedDate);

        const fetchWatchlist = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/get-watchlist.php`);
                const watchlist = response.data;

                const stockPromises = watchlist.map(async (stock) => {
                    // Initialize stock data with defaults
                    const stockData = { ...stock, price: 'N/A', companyName: stock.symbol };

                    try {
                        // Fetch stock price
                        const priceResponse = await axios.get(
                            `https://api.polygon.io/v2/aggs/ticker/${stock.symbol}/prev?apiKey=${process.env.REACT_APP_POLYGON_API_KEY}`
                        );
                        stockData.price = priceResponse.data.results[0]?.c || 'N/A';
                    } catch (err) {
                        console.error(`You've exceeded the maximum requests per minute, please wait or upgrade your subscription to continue`, err);
                    }

                    try {
                        // Fetch company name
                        const companyResponse = await axios.get(
                            `https://api.polygon.io/v1/meta/symbols/${stock.symbol}/company?apiKey=${process.env.REACT_APP_POLYGON_API_KEY}`
                        );
                        stockData.companyName = companyResponse.data.name || stock.symbol;
                    } catch (err) {
                        console.error(`Error fetching company name for symbol: ${stock.symbol}`, err);
                    }

                    return stockData;
                });

                const stocksWithPrices = await Promise.all(stockPromises);
                setStocks(stocksWithPrices);
                setIsLoading(false);
            } catch (err) {
                console.error(err);
                setError('Failed to load watchlist.');
                setIsLoading(false);
            }
        };

        fetchWatchlist();
    }, []);

    const handleDelete = async (id) => {
      if (!window.confirm("Are you sure you want to delete this stock?")) return;

      try {
          const response = await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/delete-stock.php?id=${id}`);
          if (response.status === 204) {
              // Remove the deleted stock from the local state
              setStocks(stocks.filter((stock) => stock.id !== id));
          } else {
              alert("Failed to delete the stock. Please try again.");
          }
      } catch (err) {
          console.error("Error deleting stock:", err);
          alert("An error occurred while trying to delete the stock.");
      }
    };

    const handleEdit = (id) => {

        const stockToEdit = stocks.find(stock => stock.id === id);

        navigate(`/edit-stock/${id}`, { state: { stock: stockToEdit } });
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div className="alert alert-danger">{error}</div>;
    }

    return (
        <div className="container mt-4">
            <h2>My Watchlist</h2>
            <p className="text-muted mb-0 text-end">{currentDate}</p>
            <Link to="/add-stock" className="btn btn-secondary mb-3">
                Add Stock
            </Link>
            <table className="table table-striped">
                <thead>
                    <tr>
                        <th>Symbol</th>
                        <th>Company Name</th>
                        <th>Price</th>
                        <th>Note</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {stocks.map((stock) => {
                      return(
                        <tr key={stock.id}>
                            <td>{stock.symbol}</td>
                            <td>{he.decode(stock.companyName)}</td>
                            <td>{stock.price !== 'N/A' ? `$${stock.price.toFixed(2)}` : 'N/A'}</td>
                            <td>{he.decode(stock.note)}</td>
                            <td>
                                <button
                                    className="btn btn-outline-info btn-sm me-2"
                                    onClick={() => handleEdit(stock.id)}>
                                    Edit
                                </button>
                                <button
                                    className="btn btn-outline-danger btn-sm"
                                    onClick={() => handleDelete(stock.id)}>
                                    Delete
                                </button>
                            </td>
                        </tr>
                      )
                    })}
                </tbody>
            </table>
            <div className="mt-4">
                <small className="text-muted d-block">
                    * Note: API requests are limited to 5 calls per minute as the website is currently in beta testing. 
                    Stock prices shown reflect the closing prices of the previous trading day.
                </small>
            </div>
        </div>
    );
}

export default Watchlist;
