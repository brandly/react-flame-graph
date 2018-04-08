import * as React from 'react'
import { render } from 'react-dom'
import styled from 'styled-components'
import { groupBy, last, initial, sum } from 'lodash'

const parse = input => {
  return input.split('\n').map(line => {
    const splits = line.split(' ')
    return {
      stack: initial(splits).join(' ').split(';'),
      count: parseInt(last(splits), 10)
    }
  })
}

function nest (input) {
  const data = groupBy(input, p => p.stack[0])
  const output = Object.keys(data).reduce((result, name) => {
    if (!name) return result

    data[name] = data[name].map(entry => {
      entry.stack = entry.stack.slice(1)
      return entry
    }).filter(entry => entry.stack.length)

    return result.concat({
      name,
      count: sum(data[name].map(d => d.count)),
      children: data[name].length ? nest(data[name]) : []
    })
  }, [])
  return output
}

class Demo extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      data: null,
      selected: null
    }
  }

  componentDidMount () {
    fetch('/collapsed-perf.txt')
      .then(res => res.text())
      .then(body => {
        this.setState({
          data: nest(parse(body))
        })
      })
  }

  render () {
    const { data, selected } = this.state
    return data ? (
      <div>
        {selected && <button onClick={() => {
          this.setState({ selected: null })
        }}>reset zoom</button>}
        <FlameGraph
          data={selected || data}
          onBarClick={(_, selected) => {
            this.setState({ selected })
          }}
        />
      </div>
    ) : <h1>Loading...</h1>
  }
}

const Flame = styled.div`
  width: 100%;
  position: relative;
  display: flex;
`

const Bar = styled.div`
  position: relative;
  overflow-x: hidden;
  height: 15px;
  border: 1px solid #666;
`

const Column = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
`

const Label = styled.span`
  font-size: 10px;
  position: absolute;
  padding: 0 4px;
`

class FlameGraph extends React.PureComponent {
  render () {
    const { data } = this.props
    const total = sum(data.map(d => d.count))

    return <Flame>
      {data.map((d, i) =>
        <Column
          key={i}
          style={{
            width: (d.count / total) * 100 + '%'
          }}
        >
          <FlameGraph data={d.children} onBarClick={this.props.onBarClick} />
          <Bar key={i} title={d.name} onClick={() => this.props.onBarClick(d, data)}>
            {<Label>{d.name}</Label>}
          </Bar>
        </Column>
      )}
    </Flame>
  }
}

render(<Demo />, document.querySelector('#main'))
