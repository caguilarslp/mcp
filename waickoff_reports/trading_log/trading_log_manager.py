# Trading Log Manager - wAIckoff MCP Integration
# Version 1.0 - 2025-06-13

import pandas as pd
import json
from datetime import datetime
import os

class TradingLogManager:
    def __init__(self, base_path="D:/projects/mcp/waickoff_reports"):
        self.base_path = base_path
        self.log_path = os.path.join(base_path, "trading_log")
        self.master_file = os.path.join(self.log_path, "master_trades.csv")
        self.trade_counter = 0
        
        # Initialize master file if not exists
        if not os.path.exists(self.master_file):
            self.create_master_file()
            
    def create_master_file(self):
        """Create the master trades CSV file with headers"""
        headers = [
            "Trade_ID", "Date_Time", "Symbol", "Action", "Entry_Price", 
            "Quantity", "Capital_USD", "Exit_Price", "Exit_Date", "P&L_USD", 
            "P&L_%", "Fees", "Net_P&L", "Status", "Strategy", "Timeframe", 
            "Setup_Type", "Confidence_%", "Risk_Reward", "Stop_Loss", 
            "Take_Profit_1", "Take_Profit_2", "Take_Profit_3", "SMC_Bias", 
            "SMC_Score", "Elliott_Phase", "Volume_Delta", "Wyckoff_Phase", 
            "Confluence_Score", "Entry_Reasoning", "Exit_Reasoning", 
            "Duration_Hours", "Max_Drawdown_%", "Best_Price", "Worst_Price", 
            "Screenshot_Path", "Analysis_Report_Path", "Notes"
        ]
        
        df = pd.DataFrame(columns=headers)
        df.to_csv(self.master_file, index=False)
        print(f"✅ Master trades file created at: {self.master_file}")
    
    def register_trade(self, trade_data):
        """Register a new trade entry"""
        # Generate Trade ID
        self.trade_counter += 1
        trade_id = f"T{self.trade_counter:03d}"
        trade_data["Trade_ID"] = trade_id
        trade_data["Date_Time"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        trade_data["Status"] = "OPEN"
        
        # Calculate risk metrics
        if "Entry_Price" in trade_data and "Stop_Loss" in trade_data:
            risk_pct = abs((trade_data["Stop_Loss"] - trade_data["Entry_Price"]) / trade_data["Entry_Price"] * 100)
            trade_data["Risk_%"] = round(risk_pct, 2)
            
        # Add to CSV
        df = pd.read_csv(self.master_file)
        df = pd.concat([df, pd.DataFrame([trade_data])], ignore_index=True)
        df.to_csv(self.master_file, index=False)
        
        # Create individual trade report
        self.create_trade_report(trade_data)
        
        return trade_id
    
    def create_trade_report(self, trade_data):
        """Create individual trade report file"""
        symbol = trade_data.get("Symbol", "UNKNOWN")
        trade_id = trade_data.get("Trade_ID", "T000")
        date = datetime.now().strftime("%Y-%m-%d")
        
        # Create symbol directory if not exists
        symbol_dir = os.path.join(self.base_path, symbol)
        os.makedirs(symbol_dir, exist_ok=True)
        
        # Create trade report
        report_path = os.path.join(symbol_dir, f"trade_{trade_id}_{date}.md")
        
        report_content = f"""# 📊 Trade Report - {trade_id}

## 📈 Trade Details
- **Symbol:** {symbol}
- **Entry Time:** {trade_data.get('Date_Time', '')}
- **Action:** {trade_data.get('Action', '')}
- **Entry Price:** ${trade_data.get('Entry_Price', 0)}
- **Quantity:** {trade_data.get('Quantity', 0)}
- **Capital Used:** ${trade_data.get('Capital_USD', 0)}

## 🎯 Risk Management
- **Stop Loss:** ${trade_data.get('Stop_Loss', 0)}
- **Take Profit 1:** ${trade_data.get('Take_Profit_1', 0)}
- **Take Profit 2:** ${trade_data.get('Take_Profit_2', 0)}
- **Risk %:** {trade_data.get('Risk_%', 0)}%

## 📊 Technical Analysis
- **SMC Bias:** {trade_data.get('SMC_Bias', 'N/A')}
- **SMC Score:** {trade_data.get('SMC_Score', 0)}
- **Confluence Score:** {trade_data.get('Confluence_Score', 0)}
- **Strategy:** {trade_data.get('Strategy', 'N/A')}

## 📝 Entry Reasoning
{trade_data.get('Entry_Reasoning', 'To be added...')}

---
*Trade registered by wAIckoff MCP Trading System*
"""
        
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(report_content)
            
        print(f"✅ Trade report created: {report_path}")
        
        return report_path
    
    def update_trade(self, trade_id, updates):
        """Update an existing trade"""
        df = pd.read_csv(self.master_file)
        mask = df['Trade_ID'] == trade_id
        
        for key, value in updates.items():
            df.loc[mask, key] = value
            
        df.to_csv(self.master_file, index=False)
        print(f"✅ Trade {trade_id} updated")
    
    def close_trade(self, trade_id, exit_price, exit_reasoning=""):
        """Close a trade and calculate P&L"""
        df = pd.read_csv(self.master_file)
        trade = df[df['Trade_ID'] == trade_id].iloc[0]
        
        # Calculate P&L
        entry_price = float(trade['Entry_Price'])
        quantity = float(trade['Quantity'])
        fees = float(trade.get('Fees', 2.0))  # Default $2 fees
        
        gross_pnl = (exit_price - entry_price) * quantity
        net_pnl = gross_pnl - fees
        pnl_pct = (net_pnl / float(trade['Capital_USD'])) * 100
        
        # Calculate duration
        entry_time = pd.to_datetime(trade['Date_Time'])
        exit_time = datetime.now()
        duration_hours = (exit_time - entry_time).total_seconds() / 3600
        
        # Update trade
        updates = {
            'Exit_Price': exit_price,
            'Exit_Date': exit_time.strftime("%Y-%m-%d %H:%M:%S"),
            'P&L_USD': round(net_pnl, 2),
            'P&L_%': round(pnl_pct, 2),
            'Net_P&L': round(net_pnl, 2),
            'Status': 'CLOSED',
            'Exit_Reasoning': exit_reasoning,
            'Duration_Hours': round(duration_hours, 2)
        }
        
        self.update_trade(trade_id, updates)
        
        return {
            'trade_id': trade_id,
            'pnl_usd': round(net_pnl, 2),
            'pnl_pct': round(pnl_pct, 2),
            'duration': round(duration_hours, 2)
        }
    
    def get_open_trades(self):
        """Get all open trades"""
        df = pd.read_csv(self.master_file)
        return df[df['Status'] == 'OPEN'].to_dict('records')
    
    def get_statistics(self):
        """Calculate trading statistics"""
        df = pd.read_csv(self.master_file)
        closed_trades = df[df['Status'] == 'CLOSED']
        
        if len(closed_trades) == 0:
            return {
                'total_trades': 0,
                'win_rate': 0,
                'profit_factor': 0,
                'total_pnl': 0,
                'avg_win': 0,
                'avg_loss': 0
            }
        
        wins = closed_trades[closed_trades['P&L_USD'] > 0]
        losses = closed_trades[closed_trades['P&L_USD'] < 0]
        
        stats = {
            'total_trades': len(closed_trades),
            'open_trades': len(df[df['Status'] == 'OPEN']),
            'wins': len(wins),
            'losses': len(losses),
            'win_rate': (len(wins) / len(closed_trades) * 100) if len(closed_trades) > 0 else 0,
            'total_pnl': closed_trades['P&L_USD'].sum(),
            'avg_win': wins['P&L_USD'].mean() if len(wins) > 0 else 0,
            'avg_loss': losses['P&L_USD'].mean() if len(losses) > 0 else 0,
            'profit_factor': abs(wins['P&L_USD'].sum() / losses['P&L_USD'].sum()) if len(losses) > 0 and losses['P&L_USD'].sum() != 0 else 0,
            'best_trade': closed_trades['P&L_USD'].max() if len(closed_trades) > 0 else 0,
            'worst_trade': closed_trades['P&L_USD'].min() if len(closed_trades) > 0 else 0,
            'avg_duration': closed_trades['Duration_Hours'].mean() if 'Duration_Hours' in closed_trades.columns else 0
        }
        
        return stats

# Example usage:
if __name__ == "__main__":
    # Initialize manager
    manager = TradingLogManager()
    
    # Example: Register a new trade
    new_trade = {
        'Symbol': 'XRPUSDT',
        'Action': 'BUY',
        'Entry_Price': 0.65,
        'Quantity': 1000,
        'Capital_USD': 650,
        'Stop_Loss': 0.63,
        'Take_Profit_1': 0.67,
        'Take_Profit_2': 0.69,
        'Take_Profit_3': 0.72,
        'Strategy': 'SMC Setup',
        'Timeframe': '1H',
        'SMC_Bias': 'BULLISH',
        'SMC_Score': 85,
        'Confluence_Score': 82,
        'Entry_Reasoning': 'Strong bullish order block with FVG confluence at key support'
    }
    
    # trade_id = manager.register_trade(new_trade)
    # print(f"Trade registered with ID: {trade_id}")
    
    # Get statistics
    # stats = manager.get_statistics()
    # print("\nCurrent Statistics:")
    # print(json.dumps(stats, indent=2))
